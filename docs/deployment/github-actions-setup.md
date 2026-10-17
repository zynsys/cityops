# GitHub Actions to Azure: step-by-step setup

Follow these steps, in order, to deploy CityOps to a new Azure subscription with GitHub Actions.
Repeat them for every new Azure environment. Do not skip a step's checks.
[github-actions.md](github-actions.md) describes the workflows themselves.

## Architecture decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Topology | One resource group. Production runs in the App Service production slot; dev runs in a `dev` slot. Production and dev use separate PostgreSQL databases, Key Vault secret names, storage containers and slot managed identities. | Lower cost for a reference/demo deployment. Releases are zero-downtime slot swaps. |
| Infrastructure as code | [infra/main.bicep](../../infra/main.bicep), deployed at subscription scope by the Infrastructure CI/CD workflow. It creates the resource group, `dev` slot, slot-specific settings, secrets and role assignments. | Deterministic names and incremental deployments make reruns idempotent. `what-if` previews every change. |
| Deployment identities | Separate Entra workload identities, trusted through OIDC: read-only preview, infrastructure apply, dev release and production release. | Least privilege. Dev release credentials cannot change production or infrastructure. |
| Approvals | Infrastructure apply and production promotion require an independent reviewer. Dev deploys automatically after CI. | Human control over shared and production-impacting changes. |

**Known limitation:** the slots share one App Service plan and one PostgreSQL server.
Heavy dev load can affect production. For a real customer production workload, use separate
resource groups or subscriptions per environment and keep a staging slot for swaps.

## Steps

1. [Prerequisites and pre-flight checks](#step-1-prerequisites-and-pre-flight-checks)
2. [Merge the workflow and identity changes](#step-2-merge-the-workflow-and-identity-changes)

---

## Step 1: Prerequisites and pre-flight checks

**Goal:** confirm the tools, subscription and globally unique names before creating anything.
This step makes no changes to Azure or GitHub, except provider registration (1.4).

### 1.1 Install tools

| Tool | Minimum | Check |
| --- | --- | --- |
| Azure CLI | 2.60 | `az version` |
| Bicep CLI | Latest | `az bicep upgrade` |
| GitHub CLI | 2.50 | `gh --version` |
| Git and Git Bash (Windows) | Current | `git --version` |
| jq | 1.6 | `jq --version` |

On Windows, run the repository's `.sh` scripts with Git Bash, not WSL. Examples use PowerShell.

### 1.2 Sign in and select the subscription

```powershell
az login
az account list --output table
az account set --subscription "<subscription-id>"
az account show --query "{name:name, id:id, tenant:tenantId, user:user.name}" --output table
gh auth login
gh auth status
```

Record the **subscription ID** and **tenant ID**; later steps use them.

### 1.3 Confirm permissions

You need **Owner** (or Contributor plus User Access Administrator) on the subscription, permission to
create Entra app registrations, and **admin** on the GitHub repository.

```powershell
$me = az ad signed-in-user show --query id --output tsv
az role assignment list --assignee $me --scope "/subscriptions/<subscription-id>" --query "[].roleDefinitionName" --output tsv
gh api repos/<owner>/<repo> --jq .permissions.admin
```

### 1.4 Register resource providers

Registration is idempotent and takes a few minutes the first time.

```powershell
$providers = "Microsoft.Web","Microsoft.DBforPostgreSQL","Microsoft.KeyVault","Microsoft.CognitiveServices","Microsoft.Storage","Microsoft.Insights","Microsoft.OperationalInsights","Microsoft.PolicyInsights","Microsoft.ManagedIdentity"
foreach ($p in $providers) { az provider register --namespace $p --output none }
foreach ($p in $providers) { "{0,-32} {1}" -f $p, (az provider show --namespace $p --query registrationState --output tsv) }
```

Wait until every provider reports `Registered`.

### 1.5 Choose the region and check capacity

The default region is `francecentral`. Check each capacity requirement in your chosen region:

```powershell
$region = "francecentral"
# Azure OpenAI: needs at least 100 units (100K TPM) of gpt-4o GlobalStandard quota (limit - used >= 100).
# Filtered in PowerShell because az.cmd mangles JMESPath queries containing commas or braces on Windows.
(az cognitiveservices usage list --location $region --output json | ConvertFrom-Json) |
  Where-Object { $_.name.value -like '*GlobalStandard.gpt-4o' } |
  ForEach-Object { "{0} used={1} limit={2}" -f $_.name.value, $_.currentValue, $_.limit }
# PostgreSQL Flexible Server: Standard_B1ms must be offered to your subscription.
az postgres flexible-server list-skus --location $region --query "[].supportedServerEditions[?name=='Burstable'].supportedServerSkus[].name | []" --output tsv
# App Service: the S1 Linux plan and deployment slots require Standard tier or higher.
az appservice list-locations --sku S1 --linux-workers-enabled --query "[].name" --output tsv
```

If gpt-4o quota is insufficient, request more quota or choose another region.
If PostgreSQL reports a location restriction, choose a different `AZURE_DB_LOCATION`;
PostgreSQL may use a different region from the application.

### 1.6 Choose and verify the base name

The base name derives every resource name, such as `app-<base>`, `kv-<base>`, `pg-<base>` and `st<base>`.
It must be **lowercase letters and digits only**, at most **22 characters**, and globally unique.
The default `cityops` is already taken by other tenants. Use something distinctive, such as `cityopsacme01`.

```powershell
$env:AZURE_BASE_NAME = "<base-name>"
& "C:\Program Files\Git\bin\bash.exe" scripts/infra/check-names.sh
```

Every name must report `available`. A name in your own subscription reports `already in this subscription`.
Any `TAKEN` result means you must choose another base name.

The **resource group name** (`AZURE_RESOURCE_GROUP`) is independent of the base name and may contain hyphens,
for example `rg-cityops-ai`. Bicep creates it in `AZURE_LOCATION`; never create it manually.

### 1.7 Clean up previous attempts

If you deleted an earlier resource group, wait until the deletion finishes before deploying.
A resource group name cannot be reused, or recreated in a different region, while it is still `Deleting`.

```powershell
az group exists --name "<resource-group>"   # must return false
```

Key Vault and Azure OpenAI (Cognitive Services) accounts are **soft-deleted**. They keep their names, and the
OpenAI account keeps its model quota, for the retention period: up to 90 days for Key Vault and 48 hours for
Cognitive Services. If you are reusing the old names, purge or recover them first:

```powershell
az keyvault list-deleted --query "[].{name:name, location:properties.location}" --output table
az cognitiveservices account list-deleted --query "[].{name:name, location:location}" --output table
# Permanently remove a deleted account you no longer need (irreversible):
az keyvault purge --name "<vault-name>"
az cognitiveservices account purge --location "<location>" --resource-group "<old-resource-group>" --name "<account-name>"
```

### 1.8 Record the environment values

Record these values in a secure location, such as a password manager. Do **not** commit them.

| Setting | Example | Notes |
| --- | --- | --- |
| Subscription ID | `00000000-...` | From 1.2 |
| Tenant ID | `00000000-...` | From 1.2 |
| GitHub repository | `zynsys/cityops` | `<owner>/<repo>` |
| Base name | `cityopsacme01` | From 1.6 |
| Resource group | `rg-cityops-ai` | Created by Bicep. Never create it manually. |
| App region | `francecentral` | From 1.5 |
| Database region | `francecentral` | From 1.5 |
| Azure OpenAI account name | `azopenai-cityopsacme01` | Globally unique |
| Alert email | `ops@example.com` | Receives Azure Monitor alerts |
| Approvers | GitHub users or teams | At least one person other than the person deploying |

### 1.9 Confirm GitHub supports required reviewers

The approval gates rely on GitHub environment **required reviewers**. For a **private** repository,
they need GitHub Enterprise; on Free, Pro and Team, they are available only for public repositories.
The workflows fail closed when protection is missing. Check the plan and visibility:

```powershell
gh repo view <owner>/<repo> --json visibility,owner --jq "{visibility, owner: .owner.login}"
gh api orgs/<owner> --jq .plan.name
```

If reviewers are not available, either upgrade the plan or make the repository public. Do not remove the
approval preflight to work around this.

### Step 1 checklist

- [ ] Tools installed, and signed in to Azure CLI and GitHub CLI.
- [ ] Correct subscription selected; Owner and repository admin confirmed.
- [ ] All resource providers `Registered`.
- [ ] gpt-4o quota, PostgreSQL SKU and App Service S1 are available in the chosen regions.
- [ ] Base name checked; every name is available.
- [ ] Any earlier resource group has finished deleting, and soft-deleted resources have been purged or recovered.
- [ ] Environment values recorded securely.
- [ ] GitHub plan supports required reviewers for this repository.

---

## Step 2: Merge the workflow and identity changes

**Goal:** get the workflows, Bicep and the setup script onto `main`. GitHub only runs workflows,
and OIDC environment credentials only work, from definitions on the default branch.

### 2.1 What gets created later (overview)

| GitHub environment | Entra app | Azure roles | Protection | Used by |
| --- | --- | --- | --- | --- |
| `azure-readonly` | `<base>-gh-readonly` | Reader and `<base> deployment preview` (what-if, validate, policy scan) at subscription scope | `main` only | Infra preview, policy scan, smoke test; app environment check |
| `infra` | `<base>-gh-infra` | Contributor, Resource Policy Contributor, RBAC Administrator restricted to the four roles Bicep assigns | `main` only, required reviewers, no admin bypass | Infra apply |
| `dev` | `<base>-gh-release-dev` | Reader on the resource group; Website Contributor on the `dev` slot; read `DATABASE-URL-DEV` (granted by Bicep) | `main` only | App deploy to dev slot |
| `prod` | `<base>-gh-release-prod` | Reader on the resource group; Website Contributor on the site; read `DATABASE-URL` (granted by Bicep) | `main` only, required reviewers, no admin bypass | App production promotion |

- Each app trusts exactly one subject: `repo:<owner>/<repo>:environment:<env>`. There are no branch or
  pull-request credentials, so pull requests never receive Azure tokens.
- Each environment stores its own `AZURE_CLIENT_ID` variable. Client IDs are not secret.
- `PG_ADMIN_PASSWORD`, `AUTH_SECRET` and `AUTH_SECRET_DEV` are **`infra` environment secrets**, so
  only the approved apply job can read them.
- Shared, non-secret values are repository variables.

**Demo exception:** `ALLOW_SELF_APPROVAL=true` lets a single maintainer approve their own `infra` and
`prod` runs. Use it only when one person is both author and approver. For real environments, leave it
`false` and add a second approver or team.

### 2.2 Create a branch, commit and open a pull request

```powershell
git switch -c chore/github-actions-split-identities
git add -A
git commit -m "ci: split GitHub Actions deployment identities per environment"
git push -u origin chore/github-actions-split-identities
gh pr create --fill --base main
```

### 2.3 Review and merge

1. Wait for the required checks (CodeQL, code quality and `CI gate`) to pass. Azure jobs are skipped on
   pull requests, which is expected because no Azure configuration exists yet.
2. Read Copilot code review comments if it is enabled. They are advisory and do not count as approval.
3. Merge with a squash merge.

The first push to `main` may start `CityOps Infra CI/CD`. Its preview job fails until Step 3 creates the
identities. That failure is expected; do not re-run it yet.

### Step 2 checklist

- [ ] Pull request checks green.
- [ ] Changes merged to `main`.