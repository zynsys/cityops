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
| Network | Storage and Key Vault are private (no public network access, no shared keys, no anonymous blobs). The web app uses VNet integration and private endpoints; PostgreSQL and Azure OpenAI stay public with Entra ID or firewall controls. | Complies with organisation policies (for example MCAPS "Secure PaaS" and "Safe Secrets") that force these settings on creation. |

**Known limitation:** the slots share one App Service plan and one PostgreSQL server.
Heavy dev load can affect production. For a real customer production workload, use separate
resource groups or subscriptions per environment and keep a staging slot for swaps.

## Steps

1. [Prerequisites and pre-flight checks](#step-1-prerequisites-and-pre-flight-checks)
2. [Merge the workflow and identity changes](#step-2-merge-the-workflow-and-identity-changes)
3. [Create identities, environments and secrets](#step-3-create-identities-environments-and-secrets)
4. [Deploy the infrastructure](#step-4-deploy-the-infrastructure)
5. [Deploy the app to the dev slot](#step-5-deploy-the-app-to-the-dev-slot)
6. [Promote to production](#step-6-promote-to-production)
7. [Troubleshooting](#step-7-troubleshooting)

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
$providers = "Microsoft.Web","Microsoft.DBforPostgreSQL","Microsoft.KeyVault","Microsoft.CognitiveServices","Microsoft.Storage","Microsoft.Network","Microsoft.Insights","Microsoft.OperationalInsights","Microsoft.PolicyInsights","Microsoft.ManagedIdentity"
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
| `infra` | `<base>-gh-infra` | Contributor, Resource Policy Contributor, RBAC Administrator restricted to the five roles Bicep assigns | `main` only, required reviewers, no admin bypass | Infra apply |
| `dev` | `<base>-gh-release-dev` | Reader on the resource group; Website Contributor on the `dev` slot (granted by Bicep) | `main` only | App deploy to dev slot |
| `prod` | `<base>-gh-release-prod` | Reader on the resource group; Website Contributor on the site (granted by Bicep) | `main` only, required reviewers, no admin bypass | App production promotion |

- Each app trusts exactly one subject: `repo:<owner>/<repo>:environment:<env>`. There are no branch or
  pull-request credentials, so pull requests never receive Azure tokens.
- Each environment stores its own `AZURE_CLIENT_ID` variable. Client IDs are not secret.
- `PG_ADMIN_PASSWORD`, `AUTH_SECRET` and `AUTH_SECRET_DEV` are **`infra` environment secrets**, so
  only the approved apply job can read them.
- `dev` and `prod` each hold a `DATABASE_URL` secret for their own database, used to run migrations.
  Key Vault is private, so GitHub-hosted runners cannot read it.
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

---

## Step 3: Create identities, environments and secrets

**Goal:** run [scripts/setup-github.sh](../../scripts/setup-github.sh) once. It is idempotent; re-run it
whenever the role list or secrets change.

Run it from Git Bash (Windows) or a Linux/macOS shell, signed in to both `az` (as subscription Owner) and
`gh` (as a repository admin). Enter secrets without echoing them:

```bash
read -rsp 'PostgreSQL admin password: ' PG_ADMIN_PASSWORD; echo
export PG_ADMIN_PASSWORD
export AUTH_SECRET="$(openssl rand -base64 48)"
export AUTH_SECRET_DEV="$(openssl rand -base64 48)"

AZURE_BASE_NAME=<base> \
AZURE_RESOURCE_GROUP=<resource-group> \
AZURE_LOCATION=francecentral AZURE_DB_LOCATION=francecentral \
AZURE_OPENAI_ACCOUNT_NAME=<openai-account> \
ALERT_EMAIL_ADDRESS=<email> \
GITHUB_APPROVERS=<login-or-org/team> \
ALLOW_SELF_APPROVAL=false \
bash scripts/setup-github.sh
```

- Store `PG_ADMIN_PASSWORD` in a password manager. The script writes it to the `infra` environment and
  builds the `DATABASE_URL` secrets for `dev` (`cityops_dev`) and `prod` (`cityops`).
- On a re-run you can omit the three secrets; existing values are kept. Changing `PG_ADMIN_PASSWORD`
  later requires re-running both the script and the infrastructure apply.
- The script reads the repository's OIDC subject format, so it also works with immutable subjects
  (`repo:<owner>@<owner-id>/<repo>@<repo-id>:environment:<env>`).
- `copilot` and `github-pages` environments, if present, are managed by GitHub. Leave them.

### Step 3 checklist

- [ ] Script finished without errors.
- [ ] Settings → Environments shows `azure-readonly`, `infra`, `dev` and `prod` with the expected reviewers.
- [ ] `dev` and `prod` each have an `AZURE_CLIENT_ID` variable and a `DATABASE_URL` secret.

---

## Step 4: Deploy the infrastructure

**Goal:** create every Azure resource from Bicep through the `CityOps Infra CI/CD` workflow.

```powershell
gh workflow run infra-cicd.yml --ref main -f operation=apply
gh run watch (gh run list --workflow infra-cicd.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

1. Preview, policy and cost checks run first. Read the `what-if` summary in the run. The policy
   gate reads Azure's latest stored compliance state, which takes seconds. Azure re-evaluates
   whenever a resource changes and every 24 hours. Only the nightly scheduled run forces a fresh
   scan, which takes 10–15 minutes. To force a fresh scan before a demo, run
   `az policy state trigger-scan -g <resource-group>` first.
2. The `deploy` job waits for approval of the `infra` environment. Review, then approve.
3. The deployment takes about 15–25 minutes (PostgreSQL is the slowest resource).
4. The smoke test confirms the resources exist.

What gets created: VNet with an App Service integration subnet and a private endpoint subnet; private
DNS zones; private endpoints for Blob Storage and Key Vault; PostgreSQL with `cityops` and
`cityops_dev`; Key Vault and secrets; Storage with private `report-attachments` and
`report-attachments-dev` containers; App Service plan, web app and `dev` slot; Azure OpenAI; Application
Insights, alerts and policy assignments; and all role assignments.

**If the deployment fails with a policy error** (for example `RequestDisallowedByPolicy` or
`PublicAccessNotPermitted`), list the assignments that apply and compare their effects with the
template:

```powershell
az policy assignment list --scope /subscriptions/<subscription-id> --disable-scope-strict-match -o table
```

Fix the template, merge, and re-run the workflow. Incremental deployment keeps resources that already
succeeded.

### Step 4 checklist

- [ ] Infra CI/CD run green, including the smoke test.
- [ ] The resource group contains the web app, the `dev` slot and both private endpoints.

---

## Step 5: Deploy the app to the dev slot

**Goal:** build, test and deploy the app to the `dev` slot with the `CityOps App CI/CD` workflow.

Every push to `main` that changes app files runs CI and then deploys to dev automatically:
lint, type-check, unit and integration tests, build, dependency audit, CodeQL and DevSkim.
After that it verifies the Azure resources, migrates `cityops_dev`, deploys to the `dev` slot,
smoke-tests `/api/health` and runs an OWASP ZAP baseline scan.

A manual run adds the Playwright E2E and UI (accessibility, visual, cross-browser) suites. Use it
the first time, or whenever you need demo data:

```powershell
gh workflow run app-cicd.yml --ref main -f operation=dev -f seed_demo_data=true
gh run watch (gh run list --workflow app-cicd.yml --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId')
```

| Input | Values | Effect |
| --- | --- | --- |
| `operation` | `validate` | CI only, no deployment |
| | `dev` | CI, E2E/UI, then deploy to the `dev` slot |
| | `production` | Everything in `dev`, then the approval-gated swap to production (Step 6) |
| | `load-test` | k6 load test against the dev slot |
| `seed_demo_data` | `true`/`false` | Runs `prisma/seed.ts` against the dev database (and the prod database on `production`) |

**Migrations run on every deployment** (`prisma migrate deploy`). "No pending migrations" in the log
is normal once the schema is current. **Demo data is opt-in**: without `seed_demo_data=true` the
site works but shows no reports. The seed is idempotent. It upserts its own records and deletes only
the report IDs it owns, so re-running it is safe.

Demo accounts (all use the password `Password123!`, so use them for demos only): `admin@cityops.dev`
(platform admin) and the council and citizen accounts listed in `prisma/seed.ts`.

Expect about 2 minutes of cold start after each deployment. The smoke test polls for up to
4 minutes, and the ZAP scan warms up the main pages first.

### Step 5 checklist

- [ ] Manual `operation=dev` run green, including E2E, UI, deploy and ZAP.
- [ ] `https://<web-app>-dev.azurewebsites.net/reports` lists the demo reports.

---

## Step 6: Promote to production

**Goal:** release the tested build to production with human approval and no downtime.

```powershell
gh workflow run app-cicd.yml --ref main -f operation=production -f seed_demo_data=true
```

1. The run repeats the full CI, E2E/UI, dev deployment and ZAP scan. Production can never receive a
   build that skipped those checks.
2. `Deploy to Production (swap)` waits for approval of the `prod` environment. Open the run, then
   **Review deployments → prod → Approve and deploy**. Make sure GitHub shows the approval; if the
   job still says *waiting*, the approval was not submitted.
3. The job migrates the `cityops` database, optionally seeds it, swaps `dev` into production and
   smoke-tests production.

`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` and `AZURE_STORAGE_CONTAINER` are slot-sticky (see
`infra/resources.bicep`). Each slot keeps its own database and storage after a swap.

**After a swap the `dev` slot holds the previous production build.** That is your instant rollback:

```powershell
az webapp deployment slot swap -g <resource-group> -n <web-app> --slot dev --target-slot production
```

On the **first** promotion, production was empty, so the dev slot is empty afterwards and returns
503 (`Cannot find module '/home/site/wwwroot/server.js'`). Run Step 5 again (without seeding) to
refill it. Later promotions don't have this problem.

For a real production workload, don't seed production. Demo credentials are publicly known.

### Step 6 checklist

- [ ] Production run green, including the production smoke test.
- [ ] `https://<web-app>.azurewebsites.net/reports` works.
- [ ] Dev slot redeployed after the first promotion.

---

## Step 7: Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Pages return 500; logs show `DatabaseNotReachable` | PostgreSQL Flexible Server is **stopped**. Subscription automation can stop idle servers. | `az postgres flexible-server start -g <rg> -n <pg-server>`. Check it before every demo. |
| Health check times out right after a deployment | Cold start (about 2 minutes) | Wait, then retry. The smoke test already polls. |
| Deploy jobs show *skipped* | An upstream job failed, or the run was a push (no E2E/UI) and `operation` was not set | Check the `CI gate` job and re-run with a manual dispatch |
| `npm audit` fails the build | High or critical advisory in a production dependency | Upgrade the package (`npx -y npm@11 audit fix`), then `npm rebuild` |
| Visual test fails with "snapshot doesn't exist" | A new page or changed layout has no Linux baseline | Download the `visual-baselines` artifact from the run, review it, and commit it to `e2e/visual.spec.ts-snapshots/` |
| ZAP scan times out | The app was still cold | Re-run the job; the scan warms the pages up first |
| Approval never takes effect | The review was not submitted | Check `gh api repos/<owner>/<repo>/actions/runs/<run-id>/approvals` |

Read the app logs:

```powershell
az webapp log download -g <rg> -n <web-app> --slot dev --log-file logs.zip
```