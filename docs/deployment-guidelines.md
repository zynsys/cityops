# CityOps — Deployment Guidelines

Provision Azure infrastructure and deploy CityOps from scratch, using Bicep (IaC) and Azure
DevOps YAML pipelines. Follow §1–§4 top to bottom on a clean subscription + a clean Azure DevOps
project to get a working dev + prod environment with gated CI/CD and no secrets in source
control — ending with the `infra` pipeline provisioning Azure and the `app` pipeline deploying
CityOps onto it.

---

## 1. Architecture overview

CityOps is a server-side Next.js app (App Router, NextAuth, Prisma) deployed to **Azure App Service** as **code** (no container), running the Next.js **standalone** output (`node server.js`).

### 1.1 One resource group, two logical environments

Dev and prod share a single resource group — separate resource groups would roughly double
infra cost for a project this size. Isolation is instead achieved **inside** each shared resource:

| Component     | Azure resource                                                                 | Isolation                                                                 |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Web app       | One App Service (Linux, Node 24) + a **`dev` deployment slot**                 | Slot-sticky app settings (§6) point each slot at its own DB/secret        |
| Database      | One PostgreSQL Flexible Server, two databases: `cityops` (prod), `cityops_dev` | Separate databases — dev never touches prod data                          |
| Secrets       | One Key Vault (RBAC)                                                           | Separate secret names per env: `*-URL` / `*-URL-DEV`, `AUTH-SECRET(-DEV)` |
| AI validation | One Azure OpenAI account (`gpt-4o`)                                            | Shared — stateless                                                        |
| Identity      | System-assigned managed identity **per slot**                                  | Each slot's identity is granted Key Vault access independently            |

Full blast-radius isolation (separate resource groups) roughly doubles cost — see the note at the end of §7.2.

### 1.2 Deployment flow at a glance

```mermaid
flowchart LR
    subgraph CI["Build (every push/PR)"]
        A[Build + unit tests] --> B[Integration tests]
    end
    subgraph CD["Deploy (CD)"]
        B --> C["Deploy_Dev\n(dev slot, cityops_dev)\nauto, no approval"]
        C --> D["E2E tests\n(PR / nightly / manual)"]
        D --> E["Deploy_Prod\n(migrate cityops, swap)\nmanual + approval"]
    end
```

---

## 2. Prerequisites

- Azure subscription with rights to create resources and role assignments (Owner, or Contributor + User Access Administrator)
- Azure CLI ≥ 2.60 with Bicep: `az bicep upgrade` (only needed if you want to lint/deploy locally — the pipelines don't need it on your machine)
- Azure DevOps organization + project, connected to this GitHub repository
- Permissions in that ADO project to create service connections, variable groups (Library), Environments, and pipelines

```bash
az login
az account set --subscription <SUBSCRIPTION_ID>
```

### Region

All resources default to **`francecentral`** (confirmed capacity for App Service slots,
PostgreSQL Flexible Server, and Azure OpenAI) via the independent `location`, `dbLocation`,
`openAiLocation` Bicep parameters — override any of them at pipeline-run time (via the
`cityops-env` variable group, §3.2) if a subscription lacks capacity there (see §9 for a
region-scan script).

> **Deployment slots require Standard (S1) or higher** — Free/Basic tiers don't support them, which is why `appServiceSkuName` defaults to `S1`.

---

## 3. One-time Azure DevOps setup

Everything below is a **one-time** setup per Azure DevOps project. Do these in order — each
step depends on the one before it. All of it can be done through the Azure DevOps web UI; CLI
equivalents (`az devops`/`az pipelines`) are given alongside for scripting or automation.

### 3.1 Create the ARM service connection

The pipelines need an identity to deploy to Azure. Create an **Azure Resource Manager** service
connection named **`cityops-azure-service-connection`** — this exact name is hardcoded in `.ado/app.yml` and
`.ado/infra.yml`'s `azureSubscription:` inputs (see §5.3 for why it can't come from a variable
group).

`infra/main.bicep` is **subscription-scoped** — it creates the resource group itself (there's no
`rg-cityops` to pre-create), so the service connection's underlying identity needs
**subscription-level** roles, not resource-group-level ones (you can't scope a role assignment
to a resource group that doesn't exist yet).

**UI:** Project Settings → Service connections → New service connection → Azure Resource
Manager → App registration (automatic) → Workload identity federation (recommended — no secret
to manage) → Scope level **Subscription** → select your subscription → Resource group:
**All resource groups** (leave unrestricted — the resource group is created by Bicep, not you)
→ name it `cityops-azure-service-connection` → Save.

**CLI equivalent:**

```bash
SP_JSON=$(az ad sp create-for-rbac --name cityops-azure-service-connection -o json)
SP_APP_ID=$(echo "$SP_JSON" | jq -r '.appId')
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az devops service-endpoint azurerm create \
  --name cityops-azure-service-connection \
  --azure-rm-service-principal-id "$SP_APP_ID" \
  --azure-rm-subscription-id "$SUBSCRIPTION_ID" \
  --azure-rm-subscription-name "$(az account show --query name -o tsv)" \
  --azure-rm-tenant-id "$(az account show --query tenantId -o tsv)"
```

Whichever path you use, the service principal needs **3 role assignments** at the
**subscription** scope — the automatic UI wizard and `az ad sp create-for-rbac` only grant
Contributor, so grant the other two explicitly:

- **Contributor** — create/update resources (granted automatically by the UI wizard / `az ad sp create-for-rbac`)
- **User Access Administrator** — Bicep grants Key Vault roles to each slot's managed identity, so the deploying principal must be able to grant roles too
- **Key Vault Secrets User** — the pipeline's own `AzureKeyVault@2` tasks (fetch dev/prod DB secret) run as this SP, not the App Service's managed identity; without this, every deploy fails with `403 Forbidden` on `getSecret` (Key Vault RBAC mode treats secret data-plane ops separately from Contributor)

**UI:** Subscription → **Access control (IAM)** → **+ Add** → **Add role assignment** → search
and select the role → **Next** → Members: **Select members** → search for the service
connection's app registration (its display name matches the service connection name,
`cityops-azure-service-connection`, unless you renamed it) → select it → **Review + assign**.
Repeat for all 3 roles (3 separate "Add role assignment" flows — you can only pick one role per
flow).

**CLI equivalent:** If you used the UI wizard to create the service connection, you won't have
`$SP_APP_ID` from an `az ad sp create-for-rbac` call — retrieve it from the connection itself
(works the same regardless of which path created it):

```bash
SC_ID=$(az devops service-endpoint list --query "[?name=='cityops-azure-service-connection'].id | [0]" -o tsv)
SP_APP_ID=$(az devops service-endpoint show --id "$SC_ID" --query "authorization.parameters.serviceprincipalid" -o tsv)
```

```bash
SCOPE="/subscriptions/$SUBSCRIPTION_ID"

az role assignment create --assignee "$SP_APP_ID" --role "Contributor" --scope "$SCOPE"
az role assignment create --assignee "$SP_APP_ID" --role "User Access Administrator" --scope "$SCOPE"
az role assignment create --assignee "$SP_APP_ID" --role "Key Vault Secrets User" --scope "$SCOPE"
```

> Git Bash on Windows mangles a leading `/subscriptions/...` argument into a Windows path — prefix `MSYS_NO_PATHCONV=1` before `az role assignment create` if you hit `MissingSubscription`.
>
> Assign at the **subscription** scope (`/subscriptions/$SUBSCRIPTION_ID`), not a resource
> group or individual resource — `infra/main.bicep` creates the resource group itself, so a
> narrower scope either doesn't exist yet at deploy time or silently excludes resources Bicep
> creates later (e.g. scoping `Key Vault Secrets User` to one Key Vault only works until that
> vault's name changes on a future deploy).

### 3.2 Create Library variable groups

Every environment-specific pipeline value lives in a Library variable group, never a YAML
literal (see §5.3 for details on why).

**`cityops-env`** (plain, non-secret — used by both pipelines):

**UI:** Pipelines → Library → + Variable group → name `cityops-env` → add the 5 variables below → toggle **Allow access to all pipelines** → Save.

**CLI equivalent:**

```bash
az pipelines variable-group create --name cityops-env --authorize true \
  --variables azureServiceConnection=cityops-azure-service-connection resourceGroup=rg-cityops \
              location=francecentral dbLocation=francecentral \
              baseName=cityops openAiAccountName=azopenai-cityops
```

**`cityops-infra`** (secret, provisioning-time — used by `infra.yml` only):

```bash
PGPASS="$(openssl rand -hex 20)Aa1"
AUTHSECRET="$(openssl rand -base64 32)"
AUTHSECRETDEV="$(openssl rand -base64 32)"

VG_ID=$(az pipelines variable-group create --name cityops-infra --authorize true \
  --variables placeholder=x --query id -o tsv)
az pipelines variable-group variable create --group-id "$VG_ID" --name pgAdminPassword --value "$PGPASS" --secret true
az pipelines variable-group variable create --group-id "$VG_ID" --name authSecret --value "$AUTHSECRET" --secret true
az pipelines variable-group variable create --group-id "$VG_ID" --name authSecretDev --value "$AUTHSECRETDEV" --secret true
az pipelines variable-group variable delete --group-id "$VG_ID" --name placeholder --yes
```

Store `PGPASS`/`AUTHSECRET`/`AUTHSECRETDEV` somewhere safe — rotating `pgAdminPassword` resets
the DB admin password; rotating an `authSecret*` invalidates sessions in that environment.

### 3.3 Create Environments (approval gates)

Two ADO Environments, shared by both pipelines:

- **`dev`** — no approval gate; deploys continuously on every push to `main`.
- **`prod`** — **Approval check**, 5-minute timeout, single required approver, "requester cannot approve their own run" enabled.

**UI:** Pipelines → **Environments** → New environment → name `dev` → Resource: None → Create.
Repeat for `prod`. Then on `prod`: **⋮** → **Approvals and checks** → **+ Add check** →
**Approvals** → add yourself (or a teammate) as approver → check **"The user requesting a
release or deployment should not approve it"** → timeout 5 minutes → Create.

### 3.4 Register the pipelines

Register both YAML pipelines already in this repo. Do **`infra` first** — the app pipeline
assumes the infrastructure it deploys to already exists.

**UI (repeat once per pipeline):** Pipelines → New pipeline → GitHub → authorize/select this
repository (`zynsys/cityops`) → **Existing Azure Pipelines YAML file** → branch `main`, path
`.ado/infra.yml` → Continue → click the dropdown next to **Run** → **Save** (don't run yet).
Repeat with path `.ado/app.yml`, naming it `app`.

**CLI equivalent** (needs a GitHub PAT with `repo` scope — `az devops service-endpoint github
create`, or reuse `gh auth token` if you're logged into the GitHub CLI):

```bash
GITHUB_PAT=$(gh auth token --hostname github.com)
AZURE_DEVOPS_EXT_GITHUB_PAT="$GITHUB_PAT" az devops service-endpoint github create \
  --name cityops-github --github-url https://github.com/zynsys/cityops

GITHUB_SC_ID=$(az devops service-endpoint list --query "[?name=='cityops-github'].id | [0]" -o tsv)

az pipelines create --name infra --yml-path .ado/infra.yml \
  --repository zynsys/cityops --repository-type github --branch main \
  --service-connection "$GITHUB_SC_ID" --skip-first-run true

az pipelines create --name app --yml-path .ado/app.yml \
  --repository zynsys/cityops --repository-type github --branch main \
  --service-connection "$GITHUB_SC_ID" --skip-first-run true
```

By default the `cityops-azure-service-connection` service connection is **not** authorized for all pipelines
(least privilege — see §11.2). Authorize `infra` and `app` explicitly: Project Settings →
Service connections → `cityops-azure-service-connection` → Security → add both pipelines. (Or set **"Grant access
permission to all pipelines"** on the connection if you'd rather skip this per-pipeline step.)

---

## 4. Deploy end-to-end

With §3 done, you're ready to actually provision Azure and deploy the app.

### 4.1 Run the `infra` pipeline (provision Azure)

Pipelines → `infra` → **Run pipeline** → branch `main` → Run.

This runs **Validate** (Bicep lint + `what-if` preview) then, because it was triggered manually,
**Deploy** — gated by the `prod` approval you configured in §3.3. Approve it when prompted. The
`Deploy` stage runs `az deployment sub create` against `infra/main.bicep` (subscription-scoped —
it creates the resource group itself), provisioning:

- The resource group (if it doesn't already exist)
- App Service (Linux, Node 24) + `dev` deployment slot
- PostgreSQL Flexible Server with `cityops`/`cityops_dev` databases + PostGIS
- Key Vault (RBAC) with the DB/auth secrets, and RBAC grants to each slot's managed identity
- Azure OpenAI account + `gpt-4o` model deployment

Confirm it succeeded: Pipelines → `infra` → latest run → **Deploy** stage should be green, and
the published `infra-outputs` artifact contains `webAppName`, `webAppUrl`, `keyVaultName`, etc.

> A plain push to `main` that touches `infra/**` only runs **Validate** (the `what-if` diff) —
> `Deploy` never runs automatically. You must manually trigger a run to actually apply changes.

### 4.2 Run the `app` pipeline (build, test, deploy to dev)

A push to `main` (or a manual run) triggers `app` automatically: **Build & Unit tests** →
**Integration tests** → **Deploy_Dev** — no approval, deploys straight to the dev slot and
migrates `cityops_dev`.

Watch it: Pipelines → `app` → latest run. Once `Deploy_Dev` is green:

```bash
curl -I https://<webAppName>-dev.azurewebsites.net   # from the infra-outputs artifact
```

should return a real response from the CityOps app (not the empty-container placeholder you get
before any code has ever been deployed).

### 4.3 Promote to production

Production only ever deploys from a **manually-triggered** run of `app` (the one trigger where
`E2ETest` also runs in the same run, guaranteeing E2E passes before `Deploy_Prod` can):

Pipelines → `app` → **Run pipeline** → branch `main` → Run. Once `E2ETest` and `Deploy_Dev`
succeed, `Deploy_Prod` waits for the `prod` approval (§3.3) — approve it, and it migrates
`cityops` (prod DB) then **swaps** the dev slot into production (zero-downtime; rollback = swap
back).

```bash
curl -I https://<webAppName>.azurewebsites.net       # production, after the swap
```

---

## 5. Bicep reference (deep dive)

This section documents what the `infra` pipeline's `Deploy` stage actually runs (§4.1) — useful
for understanding or modifying the template, not a separate manual step.

The template is modularized — `infra/main.bicep` is a thin **subscription-scoped** orchestrator
that creates the resource group, then deploys everything else into it via a nested
resource-group-scoped module:

| File                                                                        | Owns                                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`infra/main.bicep`](../infra/main.bicep)                                   | Subscription-scoped orchestrator: creates the resource group, invokes `resources.bicep` |
| [`infra/modules/resourcegroup.bicep`](../infra/modules/resourcegroup.bicep) | Creates (or adopts) the resource group                                                  |
| [`infra/modules/resources.bicep`](../infra/modules/resources.bicep)         | Resource-group-scoped orchestration: modules, Key Vault secrets, app settings, RBAC      |
| [`infra/modules/keyvault.bicep`](../infra/modules/keyvault.bicep)           | Key Vault (RBAC-enabled)                                                                 |
| [`infra/modules/postgres.bicep`](../infra/modules/postgres.bicep)           | Flexible Server, `cityops`/`cityops_dev` DBs, PostGIS, firewall                          |
| [`infra/modules/appservice.bicep`](../infra/modules/appservice.bicep)       | Plan, Web App **+ `dev` deployment slot**                                                |
| [`infra/modules/openai.bicep`](../infra/modules/openai.bicep)               | Azure OpenAI account + `gpt-4o` model deployment                                         |

Resource names are derived deterministically (`uniqueString(resourceGroup().id)`), so re-running a deployment on the same resource group **adopts and updates** existing resources rather than creating duplicates.

Key parameters (set via the `cityops-env`/`cityops-infra` variable groups, §3.2):

| Parameter                                                         | Default                            | Purpose                                                                  |
| ----------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `resourceGroupName`                                               | `rg-cityops`                       | Name of the resource group to create (if missing) and deploy into       |
| `baseName`                                                        | `cityops`                          | Prefix for every generated resource name (`app-<baseName>-<hash>`, etc.) |
| `location` / `dbLocation` / `openAiLocation`                      | `francecentral`                    | Region per resource type                                                 |
| `appServiceSkuName` / `appServiceSkuTier`                         | `S1` / `Standard`                  | App Service plan SKU                                                     |
| `alwaysOn`                                                        | `true`                             | Keep the app warm (Standard+)                                            |
| `openAiAccountName`                                               | `azopenai-cityops`                 | Azure OpenAI account name                                                |
| `openAiDeploymentName` / `openAiModelName` / `openAiModelVersion` | `gpt-4o` / `gpt-4o` / `2024-11-20` | Model deployment                                                         |
| `openAiSkuName` / `openAiCapacity`                                | `GlobalStandard` / `100`           | Throughput (TPM), subject to quota                                       |
| `pgAdminPassword`                                                 | _(secure)_                         | PostgreSQL admin password                                                |
| `authSecret` / `authSecretDev`                                    | _(secure)_                         | Prod / dev-slot `AUTH_SECRET`                                            |

Bicep-generated resource **names** aren't stored anywhere beyond `baseName` — each deploy job in
`app.yml` resolves the actual name at runtime by naming convention:

```bash
webAppName=$(az webapp list -g "$(resourceGroup)" --query "[?starts_with(name,'app-$(baseName)-')].name | [0]" -o tsv)
keyVaultName=$(az keyvault list -g "$(resourceGroup)" --query "[?starts_with(name,'kv-$(baseName)-')].name | [0]" -o tsv)
```

If you ever need to deploy the template directly (bypassing the pipeline, e.g. for local testing):

```bash
RG=rg-cityops
az deployment sub create \
  --location francecentral -n cityops-infra \
  -f infra/main.bicep \
  -p resourceGroupName="$RG" location=francecentral dbLocation=francecentral \
     pgAdminPassword="$PGPASS" authSecret="$AUTHSECRET" authSecretDev="$AUTHSECRETDEV" \
  --query "properties.outputs" -o json
```

Outputs: `webAppName`, `webAppUrl`, `devSlotName`, `devSlotUrl`, `keyVaultName`, `postgresFqdn`, `resourceGroupName`.

### 5.3 Why the service connection name is a literal, not a variable

Every other environment-specific value (`resourceGroup`, `baseName`, `location`, secrets) comes
from the `cityops-env`/`cityops-infra` variable groups — **except** the service connection name,
which is hardcoded as the literal string `'cityops-azure-service-connection'` in both `.ado/app.yml` and
`.ado/infra.yml`'s `azureSubscription:` inputs. This isn't an oversight: Azure DevOps performs a
**static resource-authorization check** on `azureSubscription:` inputs at YAML-compile time, and
that check can't resolve a variable-group-sourced runtime macro like `$(azureServiceConnection)`
— it validates against the literal, unexpanded string and always reports "service connection
... could not be found," regardless of whether the connection is actually authorized. If you
rename the connection, update the literal in both YAML files (and re-authorize it per §3.4).

---

## 6. Application configuration (env vars) & secrets model

Runtime config mirrors [`.env.example`](../.env.example): non-secret values are App Service settings; secrets are **Key Vault references** resolved by each slot's managed identity.

| Variable                                            | Source in Azure                                              |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`                                      | Key Vault ref (`DATABASE-URL` / `-DEV`), slot-sticky         |
| `AUTH_SECRET`                                       | Key Vault ref (`AUTH-SECRET` / `-DEV`), slot-sticky          |
| `NEXTAUTH_URL`                                      | App setting per slot, slot-sticky                            |
| `NODE_ENV`                                          | `production`                                                 |
| `STORAGE_PROVIDER`                                  | `local` (or `azure` + storage vars)                          |
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_DEPLOYMENT` | App setting, shared by both slots                            |
| `AZURE_OPENAI_API_KEY`                              | Key Vault ref (`AZURE-OPENAI-API-KEY`), shared by both slots |

Config is validated at startup by `validateEnv()` (`src/instrumentation.ts`) — a missing required variable fails fast.

### Secrets model — three tiers

| Tier                             | Used by             | Stored in                                  | Examples                                                          |
| -------------------------------- | ------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| **Provisioning-time**            | Infra pipeline only | `cityops-infra` variable group (secret)    | `pgAdminPassword`, `authSecret`, `authSecretDev`                  |
| **Runtime**                      | The running app     | Azure Key Vault, read via managed identity | `DATABASE-URL(-DEV)`, `AUTH-SECRET(-DEV)`, `AZURE-OPENAI-API-KEY` |
| **Pipeline config (non-secret)** | Both pipelines      | `cityops-env` variable group               | `resourceGroup`, `location`, `dbLocation`, `baseName`             |

No secret is ever a plaintext App Service setting or a pipeline YAML literal — always `@Microsoft.KeyVault(VaultName=...;SecretName=...)`, resolved via **Key Vault Secrets User** RBAC. `AZURE-OPENAI-API-KEY` is pulled from the OpenAI account with `listKeys()` inside Bicep, never exposed as an output.

---

## 7. Deployment flow (CI/CD) reference

### 7.1 App pipeline (`app`)

```
Build & Unit tests → Integration tests → Deploy_Dev (dev slot, migrate cityops_dev) [env: dev, no approval]
                                       ↘ E2E tests (PR / nightly / manual only)

Manual run only: ... → E2E tests (passes) → Deploy_Prod (migrate cityops, swap dev→prod) [env: prod, approval]
```

- **Build** produces an environment-agnostic standalone artifact (`drop`) — no runtime config needed.
- **Deploy_Dev** auto-deploys to the dev slot + migrates `cityops_dev` on every push to `main`, no approval.
- **E2E tests** run on PRs, nightly, and manual runs only — not on every push, to keep dev-deploy fast.
- **Deploy_Prod** only runs on a manually-triggered run (the one trigger where E2E also runs), depends on `Deploy_Dev` + `E2ETest`, migrates `cityops`, then **swaps** dev → production. Gated by the `prod` approval — there is no automatic path to production.

### 7.2 Infra pipeline (`infra`)

```
Validate (bicep lint + what-if, every push/PR) → Deploy (manual run only) [env: prod, approval]
```

`what-if` runs automatically on every push/PR — read the diff before applying. `Deploy` only runs on a manual pipeline run, gated by the same `prod` approval.

> Infra provisions **shared** resources in one apply (one Key Vault, one Postgres server, one plan for both slots), so there's no separate "dev infra" to test first the way the app tests in the dev slot before promoting — the automatic `what-if` diff plus the manual-run + approval gate is the equivalent safeguard. Full dev/prod infra isolation (separate resource groups) would enable that, but roughly doubles cost and retires the slot-swap design (§1.1) — not implemented by default.

---

## 8. Manual operations

```bash
# Run migrations
DATABASE_URL="<cityops_dev connection string>" npm run db:migrate:deploy   # dev
DATABASE_URL="<cityops connection string>" npm run db:migrate:deploy       # prod

# Seed data (non-production only)
DATABASE_URL="<cityops_dev connection string>" npm run db:seed

# Roll back production (previous build is still in the dev slot after a swap)
az webapp deployment slot swap -g rg-cityops -n <WEB_APP_NAME> --slot dev --target-slot production

# Verify
curl -I https://<WEB_APP_NAME>.azurewebsites.net          # production
curl -I https://<WEB_APP_NAME>-dev.azurewebsites.net       # dev slot
```

---

## 9. Troubleshooting

| Symptom                                                                                 | Cause / Fix                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SubscriptionIsOverQuotaForSku … Total VMs: 0`                                          | No App Service quota in that region — try another region or request an increase. Slots need S1+.                                                                                              |
| PostgreSQL `Version should be in: []`                                                   | Flexible Server SKU not offered in that region — change `dbLocation`.                                                                                                                         |
| `NetworkAcls is required for this resouce` (Azure OpenAI)                               | Set `networkAcls.defaultAction` explicitly in the module.                                                                                                                                     |
| Missing `server.js` / standalone output not found                                       | `output: 'standalone'` must be set in [`next.config.ts`](../next.config.ts).                                                                                                                  |
| Migration can't reach the DB from the agent                                             | Ensure the "Allow Azure services" firewall rule exists, or add the agent IP.                                                                                                                  |
| Key Vault reference unresolved (app can't read a secret at runtime)                     | Confirm **Key Vault Secrets User** is granted to that specific slot's managed identity (Bicep does this — check the RBAC blade if it's missing).                                              |
| Pipeline's `AzureKeyVault@2` task fails with `403 Forbidden` on `getSecret`             | The service connection's SP itself needs **Key Vault Secrets User** at the resource group scope (§3.1) — separate from the slot's managed identity.                                           |
| `azureSubscription: '$(azureServiceConnection)'` fails validation: "could not be found" | ADO can't statically resolve a variable-group macro for this input — must be the literal connection name (see §5.3).                                                                          |
| Dynamic name lookup (`az webapp list ... starts_with`) returns empty                    | Infra not deployed yet, or `resourceGroup` in `cityops-env` is wrong. Run the `infra` pipeline first (§4.1).                                                                                  |
| `az devops invoke` errors `could not convert string to float`                           | Use the bare preview API version (e.g. `7.2-preview`, no `.N` suffix).                                                                                                                        |
| `az devops invoke` GET ignores `resourceType`/`resourceId`                              | Pass them via `--query-parameters`, not `--route-parameters`.                                                                                                                                 |
| `az devops invoke` JSON output fails to parse (`Expecting value`)                       | CLI sometimes prints a status line before the JSON — strip the first line or parse stdout/stderr separately.                                                                                  |
| `az rest` against `hp-gmail-org`-style (MSA-backed) orgs returns an HTML sign-in page   | AAD resource-token auth isn't accepted the way the `az devops`/`az pipelines` extension's own auth flow is — use `az devops`/`az pipelines` commands instead of raw `az rest` where possible. |
| ARM Template Deployment fails: `403 Failed to check the resource group status`          | SP has no RBAC on the target resource group — grant it (§3.1).                                                                                                                                |
| ARM deployment fails: `ResourceNotFound` for a resource the template itself creates     | An `existing`-typed lookup (e.g. `openAiRef`, `keyVaultRef`) is racing the module that creates it — add an explicit `dependsOn` on the lookup.                                                |
| `az role assignment create --scope /subscriptions/...` fails with `MissingSubscription` | Git Bash mangles the path — prefix `MSYS_NO_PATHCONV=1`.                                                                                                                                      |
| Key Vault/Cognitive Services deployment fails: resource "has been soft-deleted"         | A same-named resource was deleted recently and Azure retains it for a retention period — `az keyvault purge` / `az cognitiveservices account purge`, or pick a different name.                |

### Find a region with capacity

```bash
for r in francecentral ukwest westeurope northeurope; do
  echo "== $r =="
  az deployment sub what-if --location "$r" -f infra/main.bicep -n quotacheck \
    -p resourceGroupName=rg-cityops location=$r dbLocation=$r \
       pgAdminPassword="Throwaway$(openssl rand -hex 8)Aa1" \
       authSecret="throwaway-validate-secret-0123456789abcd" \
       authSecretDev="throwaway-validate-secret-dev-0123456789ab" \
    2>&1 | grep -iE "quota|SubscriptionIsOver" || echo "OK (no quota error)"
done
```

---

## 10. Cost & teardown

- **S1 Standard** ≈ $70/month (required for slots). Downgrade to F1 to pause costs (removes the dev slot — F1 doesn't support slots):

  ```bash
  az appservice plan update -g rg-cityops -n asp-cityops --sku F1
  ```

- Full teardown (irreversible — deletes everything in the resource group, incl. `azopenai-cityops`):

  ```bash
  az group delete -n rg-cityops --yes --no-wait
  ```

Delete individual resources instead of the whole group if `rg-cityops` contains anything you need to keep.

---

## 11. Additional hardening & best practices

§1–§10 cover the core requirements. This section covers extra hardening that's standard practice but easy to miss.

### 11.1 GitHub repository connection & branch protection

The repo lives on **GitHub**, not Azure Repos, so two things that don't show up anywhere else
in this document need setting up:

- **GitHub service connection** — needed so pipelines can trigger on GitHub push/PR (§3.4 creates one via `gh auth token`, or a PAT with `repo` scope). Otherwise: Project Settings → Service connections → New → **GitHub**.
- **Branch protection on `main`** — this is a GitHub setting (ADO branch policies don't apply to a GitHub-hosted repo):

  ```bash
  gh api repos/zynsys/cityops/branches/main/protection -X PUT --input - <<'EOF'
  {
    "required_status_checks": { "strict": true, "contexts": ["app"] },
    "enforce_admins": true,
    "required_pull_request_reviews": { "required_approving_review_count": 1 },
    "restrictions": null
  }
  EOF
  ```

### 11.2 Environment hardening beyond the approval check

- **Requester cannot approve their own run** — already enabled in §3.3 (separation of duties).
- **Branch control check** — restricts `prod` deploys to `main` only: Environments → `prod` → Approvals and checks → **Branch control** → `refs/heads/main`.
- **Exclusive lock check** — serializes concurrent `prod` deploys: Approvals and checks → **Exclusive lock**. YAML side already set: `Deploy_Prod`/`Deploy` set `lockBehavior: sequential`.
- **Least-privilege service connection** — leave `cityops-azure-service-connection` NOT authorized for all pipelines by default; explicitly authorize `app`/`infra` under Service connections → `cityops-azure-service-connection` → Security (§3.4).

### 11.3 Pipeline hygiene

- **Lint** and **`npm audit --audit-level=high`** run in `Build_and_UnitTest` as **warn-only** — the repo has 9 pre-existing lint errors; fix those, then make it blocking.
- **Shared resolve-names template** — [`.ado/templates/resolve-names.yml`](../.ado/templates/resolve-names.yml), used by both `Deploy_Dev` and `Deploy_Prod`.
- **Nightly drift detection** — `infra.yml`'s `Validate` stage also runs on a nightly schedule; `Deploy` stays manual-gated, so nothing auto-applies.

### 11.4 Retention & cost governance

- **Retention** — set once: Project Settings → Pipelines → Settings → **Retention** (not scriptable via a verified REST endpoint).
- **Resource tagging** — every resource in `infra/main.bicep` carries a `tags` object (default `{ project: 'cityops', managedBy: 'bicep' }`, overridable) for cost allocation.

---

## 12. Reference files

| File                                                                      | Purpose                                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`infra/main.bicep`](../infra/main.bicep)                                 | Subscription-scoped infrastructure orchestrator                 |
| [`infra/modules/resourcegroup.bicep`](../infra/modules/resourcegroup.bicep) | Creates (or adopts) the resource group                        |
| [`infra/modules/resources.bicep`](../infra/modules/resources.bicep)       | Resource-group-scoped orchestrator (modules, secrets, RBAC)     |
| [`infra/modules/keyvault.bicep`](../infra/modules/keyvault.bicep)         | Key Vault module                                                |
| [`infra/modules/postgres.bicep`](../infra/modules/postgres.bicep)         | PostgreSQL Flexible Server module                               |
| [`infra/modules/appservice.bicep`](../infra/modules/appservice.bicep)     | App Service (plan + web app + dev slot) module                  |
| [`infra/modules/openai.bicep`](../infra/modules/openai.bicep)             | Azure OpenAI account + model deployment module                  |
| [`.ado/app.yml`](../.ado/app.yml)                                         | App CI/CD (build, test, deploy dev/prod)                        |
| [`.ado/infra.yml`](../.ado/infra.yml)                                     | Infra pipeline (validate + apply)                               |
| [`.ado/templates/resolve-names.yml`](../.ado/templates/resolve-names.yml) | Shared web app / Key Vault name resolution step (§11.3)         |
| [`.env.example`](../.env.example)                                         | Full list of runtime environment variables                      |
| [`Dockerfile`](../Dockerfile)                                             | Optional container build (not used for App Service code deploy) |
