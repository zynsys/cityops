# CityOps — Deployment Guidelines

End-to-end instructions to provision the Azure infrastructure and deploy CityOps from scratch, using Bicep (IaC) and Azure DevOps pipelines. Follow this to reproduce the environment on a clean subscription.

---

## 1. Architecture overview

CityOps is a server-side Next.js app (App Router, NextAuth, Prisma) deployed to **Azure App Service** as **code** (no container) using the Next.js **standalone** output (`node server.js`).

| Component      | Azure resource                                              | Notes                                                                     |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Web app (prod) | App Service (Linux, Node 20) — **production slot**          | Runs `node server.js`                                                     |
| Web app (dev)  | App Service **`dev` deployment slot**                       | Requires Standard (S1)+                                                   |
| Database       | Azure Database for **PostgreSQL Flexible Server** + PostGIS | Two DBs: `cityops` (prod), `cityops_dev` (dev)                            |
| AI validation  | Azure OpenAI (`gpt-4o`)                                     | Created by IaC; shared by both slots (not slot-sticky)                    |
| Secrets        | Azure Key Vault (RBAC)                                      | `DATABASE-URL`, `DATABASE-URL-DEV`, `AUTH-SECRET`, `AZURE-OPENAI-API-KEY` |
| Identity       | System-assigned managed identity on the web app + dev slot  | Reads Key Vault via `@Microsoft.KeyVault(...)` references                 |

**Environment → slot → database mapping**

| Environment | Slot       | Database      | Key Vault secret   |
| ----------- | ---------- | ------------- | ------------------ |
| Dev         | `dev`      | `cityops_dev` | `DATABASE-URL-DEV` |
| Prod        | production | `cityops`     | `DATABASE-URL`     |

`DATABASE_URL` and `NEXTAUTH_URL` are **slot-sticky**, so they do not travel during a slot swap — each slot always keeps its own database.

---

## 2. Prerequisites

- **Azure subscription** with permissions to create resources and role assignments (Owner, or Contributor + User Access Administrator).
- **Azure CLI** ≥ 2.60 with the Bicep extension: `az bicep upgrade`.
- **Node.js 20** and **npm**.
- **Azure DevOps** organization + project, connected to this GitHub repository.
- Local login:

  ```bash
  az login
  az account set --subscription <SUBSCRIPTION_ID>
  ```

### Region & quota notes (important)

This project was provisioned across two UK regions because of subscription constraints:

- **App Service + Key Vault → `ukwest`** — the subscription had **0 App Service compute quota** in several regions (`eastus`, `uksouth`, etc.). `ukwest` had quota.
- **PostgreSQL Flexible Server → `uksouth`** — the Flexible Server SKU (`Standard_B1ms`) was **not offered in `ukwest`**.
- **Azure OpenAI → `eastus`** (`openAiLocation` parameter, independent of the above) — model/region availability for Azure OpenAI varies separately again; `eastus` has broad model availability and is the default. Azure OpenAI access must also be enabled on the subscription (a one-time Microsoft approval step outside Bicep's control) before any deployment succeeds.

If you deploy to a fresh subscription, check quota first. To find a region with App Service quota, run a read-only `what-if` per region (see §8 Troubleshooting) and pick one that passes.

> **Deployment slots require Standard (S1) or higher.** Free (F1) and Basic (B1) do **not** support slots.

---

## 3. Provision infrastructure with Bicep

The template is modularized — `infra/main.bicep` orchestrates one module per logical concern:

| File                                                                  | Owns                                                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`infra/main.bicep`](../infra/main.bicep)                             | Orchestration: wires modules together, builds Key Vault secrets, app settings, role assignments |
| [`infra/modules/keyvault.bicep`](../infra/modules/keyvault.bicep)     | Key Vault (RBAC-enabled)                                                                        |
| [`infra/modules/postgres.bicep`](../infra/modules/postgres.bicep)     | PostgreSQL Flexible Server, `cityops`/`cityops_dev` databases, PostGIS extension, firewall rule |
| [`infra/modules/appservice.bicep`](../infra/modules/appservice.bicep) | App Service plan, Web App, `dev` slot, slot-sticky config                                       |
| [`infra/modules/openai.bicep`](../infra/modules/openai.bicep)         | Azure OpenAI account + `gpt-4o` model deployment                                                |

> Modules are split by **logical concern** (data / security / compute / AI), not one file per resource instance — a Web App and its slot are one cohesive unit and live in the same module.
>
> Resource names are derived deterministically (`uniqueString(resourceGroup().id)` for the app/DB/vault; a fixed default name for the OpenAI account). Re-running a deployment with the same names **adopts and updates** existing resources rather than creating duplicates — this is how the OpenAI account and model deployment, originally created manually, were brought under Bicep management without disruption.

Key parameters:

| Parameter                                                         | Default                            | Purpose                                       |
| ----------------------------------------------------------------- | ---------------------------------- | --------------------------------------------- |
| `location`                                                        | resource group location            | App Service + Key Vault region                |
| `dbLocation`                                                      | `uksouth`                          | PostgreSQL region (kept separate)             |
| `openAiLocation`                                                  | `eastus`                           | Azure OpenAI region (kept separate)           |
| `appServiceSkuName` / `appServiceSkuTier`                         | `S1` / `Standard`                  | S1+ enables slots                             |
| `alwaysOn`                                                        | `true`                             | Keep the app warm (Standard+)                 |
| `devSlotName`                                                     | `dev`                              | Non-production slot                           |
| `openAiAccountName`                                               | `azopenai-cityops`                 | Azure OpenAI account name                     |
| `openAiDeploymentName` / `openAiModelName` / `openAiModelVersion` | `gpt-4o` / `gpt-4o` / `2024-11-20` | Model deployment                              |
| `openAiSkuName` / `openAiCapacity`                                | `GlobalStandard` / `100`           | Deployment throughput (TPM), subject to quota |
| `pgAdminPassword`                                                 | _(secure)_                         | PostgreSQL admin password                     |
| `authSecret`                                                      | _(secure)_                         | NextAuth `AUTH_SECRET` (≥ 32 chars)           |

### 3.1 Generate stable secrets

Generate these **once** and keep them stable (store in a variable group / Key Vault). Rotating `pgAdminPassword` resets the DB admin password; rotating `authSecret` invalidates existing sessions.

```bash
# PostgreSQL admin password (alphanumeric, meets complexity)
PGPASS="$(openssl rand -hex 20)Aa1"

# NextAuth secret (>= 32 chars)
AUTHSECRET="$(openssl rand -base64 32)"
```

### 3.2 Deploy

```bash
RG=rg-cityops
az group create -n "$RG" -l ukwest   # or your chosen region

az deployment group create \
  -g "$RG" -n cityops-infra \
  -f infra/main.bicep \
  -p location=ukwest dbLocation=uksouth \
     pgAdminPassword="$PGPASS" \
     authSecret="$AUTHSECRET" \
  --query "properties.outputs" -o json
```

### 3.3 Capture outputs

Resource names are derived from `uniqueString(resourceGroup().id)`, so they differ per resource group. Retrieve them:

```bash
az deployment group show -g "$RG" -n cityops-infra \
  --query "properties.outputs" -o json
```

Outputs include: `webAppName`, `webAppUrl`, `devSlotName`, `devSlotUrl`, `keyVaultName`, `postgresFqdn`.

---

## 4. Azure DevOps setup (one-time)

### 4.1 Service connection

Create an **Azure Resource Manager** service connection named **`cityops-azure`**
(Project Settings → Service connections → New → Azure Resource Manager).

Its service principal needs, on `rg-cityops`:

- **Contributor** — deploy the web app and swap slots.
- **Key Vault Secrets User** — read secrets in the `AzureKeyVault@2` task.

```bash
# Example: grant the service connection's SP the Key Vault role
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_APP_ID> \
  --role "Key Vault Secrets User" \
  --scope $(az keyvault show -n <KEYVAULT_NAME> -g rg-cityops --query id -o tsv)
```

### 4.2 Environments (approval gates)

Only **two** ADO Environments exist, matching the only two real deployment targets — both the app pipeline and the infra pipeline reuse them (no separate "infra" environment):

- **`dev`** — deploy target for the dev slot (app) and shared by the infra pipeline's Deploy stage. **No approval gate** — dev deploys continuously and automatically on every push to `main`, for fast feedback.
- **`prod`** — deploy target for production (app); the infra pipeline's Deploy stage also targets **`prod`**, since a single Bicep apply provisions/updates the shared, production-impacting resources (Key Vault, PostgreSQL, App Service plan) alongside both slots. **Has an approval gate.**

Create them under Pipelines → **Environments**.

The `prod` environment has an **Approval check with a 5-minute timeout** (not the platform default of 30 days), approved by a single required approver. A pending approval does **not** consume agent minutes — the stage sits in a "Waiting" state and no agent is allocated until it's approved. If it isn't approved within 5 minutes, the check times out and the stage fails (no indefinite hang).

> This asymmetry — no gate on dev, a gate on prod — is standard practice: lower environments favor fast, continuous feedback; production favors deliberate, reviewed releases.

To add or inspect an approval check:

- **UI**: Pipelines → Environments → _(environment)_ → **Approvals and checks** → **+ Add check** → **Approvals** → set **Timeout** to 5 minutes → choose approver(s).
- **API** (used to create these): `POST https://dev.azure.com/{org}/{project}/_apis/pipelines/checks/configurations?api-version=7.2-preview` with a body of:

  ```json
  {
    "type": { "id": "8C6F20A7-A545-4486-9777-F762FAFE0D4D", "name": "Approval" },
    "settings": {
      "approvers": [{ "id": "<identity storage key>" }],
      "executionOrder": "anyOrder",
      "minRequiredApprovers": 1,
      "requesterCannotBeApprover": false
    },
    "resource": { "type": "environment", "id": "<environment id>" },
    "timeout": 5
  }
  ```

  The approver `id` must be the Identity service **storage key** (a GUID), not the Graph profile id. Resolve it via `Graph/Users` (find the descriptor for the target account) then `Graph/StorageKeys` with that descriptor.

### 4.3 Variable group (infra pipeline)

Pipelines → **Library** → variable group **`cityops-infra`** with **secret**, **stable** variables:

- `pgAdminPassword`
- `authSecret`

> Naming note: `cityops-infra` here is a **Library variable group**, unrelated to ADO Environments — there is no `cityops-infra` *environment*. The similarly-named `-n cityops-infra` in the `az deployment group create` commands (§3.2) is just the ARM deployment's name, also unrelated. Three different things share this name by coincidence; only the variable group and the ARM deployment name remain.

### 4.4 Register pipelines

Pipelines → New pipeline → Existing YAML file:

| Pipeline        | YAML file                                                             | Purpose                                                  |
| --------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| `CityOps-CI`    | [`.ado/modern/modern-cityops-app.yml`](../.ado/modern/modern-cityops-app.yml)             | App build, tests, coverage, **Deploy_Dev → Deploy_Prod** |
| `CityOps-Infra` | [`.ado/modern/modern-cityops-infra.yml`](../.ado/modern/modern-cityops-infra.yml) | Infra **Validate → Deploy**                              |

---

## 5. Application configuration (env vars) & secrets model

Runtime configuration mirrors [`.env.example`](../.env.example). In Azure these are set as **App Service application settings**; secrets use **Key Vault references** resolved by the managed identity.

| Variable                                            | Source in Azure                                                        | Required                   |
| --------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| `DATABASE_URL`                                      | Key Vault reference (`DATABASE-URL` / `DATABASE-URL-DEV`), slot-sticky | ✅                         |
| `AUTH_SECRET`                                       | Key Vault reference (`AUTH-SECRET`)                                    | ✅ (prod)                  |
| `NEXTAUTH_URL`                                      | App setting per slot (slot-sticky)                                     | ✅ (prod)                  |
| `NODE_ENV`                                          | `production`                                                           | ✅                         |
| `STORAGE_PROVIDER`                                  | `local` (or `azure` + storage vars)                                    | default `local`            |
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_DEPLOYMENT` | App setting (not secret), shared by both slots                         | required for AI validation |
| `AZURE_OPENAI_API_KEY`                              | Key Vault reference (`AZURE-OPENAI-API-KEY`), shared by both slots     | required for AI validation |

Config is validated at startup by `validateEnv()` (via `src/instrumentation.ts`); a missing required variable fails fast with a clear message.

### Two-tier secrets model

There are two distinct categories of secret, stored in two distinct places — do not mix them up:

| Category              | Used by                                        | Stored in                                           | Examples                                                                  |
| --------------------- | ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| **Provisioning-time** | The _infra pipeline_, once, to seed everything | ADO variable group `cityops-infra` (Library, secret-flagged — not an Environment) | `pgAdminPassword`, `authSecret`                                           |
| **Runtime**           | The _running application_                      | Azure Key Vault, read via managed identity          | `DATABASE-URL`, `DATABASE-URL-DEV`, `AUTH-SECRET`, `AZURE-OPENAI-API-KEY` |

No secret is ever stored in pipeline YAML or as a plaintext App Service setting — runtime secrets are always `@Microsoft.KeyVault(VaultName=...;SecretName=...)` references, resolved by each slot's own system-assigned managed identity (granted **Key Vault Secrets User** via RBAC). The `AZURE-OPENAI-API-KEY` secret value is pulled from the OpenAI account with `listKeys()` inside Bicep and written straight into Key Vault — it is never exposed as a deployment output.

> Currently a single Key Vault holds secrets for both environments (differentiated by name, e.g. `DATABASE-URL` vs `DATABASE-URL-DEV`). For stronger isolation, a future hardening step is to split into per-environment vaults (`kv-cityops-dev`, `kv-cityops-prod`).

---

## 6. Deployment flow (CI/CD)

### 6.1 App pipeline (`CityOps-CI`)

```
Build & Unit tests  →  Integration tests  →  Deploy_Dev (dev slot, migrate cityops_dev)  [env: dev, no approval]
                                          ↘  E2E tests (PR / nightly / manual only)

Manual run only:  ... → E2E tests (passes) → Deploy_Prod (migrate cityops, swap dev→prod)  [env: prod, approval]
```

- **Build** produces an environment-agnostic **standalone** artifact (`drop`). No runtime config needed — the Prisma client is lazily instantiated.
- **Deploy_Dev** deploys `drop` to the **dev slot** and runs `db:migrate:deploy` against `cityops_dev` automatically on every push to `main` — **no approval gate**, for fast continuous feedback.
- **E2E tests** run on **PRs** (pre-merge safety net), the **nightly schedule** (health check), and **manual runs** — deliberately **not** on every push to `main`, to keep the continuous dev-deploy path fast.
- **Deploy_Prod** only runs as part of a **manually triggered pipeline run** (Pipelines → `CityOps-CI` → **Run pipeline**) — the one trigger where `E2ETest` also runs in the same run. It depends on both `Deploy_Dev` and `E2ETest` succeeding, so **production can never deploy without E2E passing**, without E2E ever running on ordinary pushes. It migrates `cityops` (prod) then **swaps** dev → production (zero-downtime), gated by the `prod` approval.

`Deploy_Dev` runs automatically on every push to `main` (and on manual runs). `Deploy_Prod` runs **only** on manual runs — there is no automatic path to production.

### 6.2 Infra pipeline (`CityOps-Infra`)

```
Validate (bicep lint + what-if, every push/PR)  →  Deploy (manual run only)  [env: prod, approval]
```

`what-if` is the infra "build/preview" and runs automatically on every push/PR to `infra/**` — read this diff before applying. **`Deploy` only runs on a manually-triggered pipeline run** (Pipelines → `CityOps-Infra` → **Run pipeline**), never automatically, and is gated by the **same `prod` environment/approval** the app pipeline uses.

> **Why infra doesn't have a "test in dev first" step like the app does:** the app builds one artifact and deploys it twice (dev slot, then swap to prod) — genuine dev-first validation of the same bits. Infra instead provisions **shared** resources in a single apply (one Key Vault, one Postgres server, one App Service plan serving both dev and prod slots at once) — there's no separate "dev infra" to isolate and test first; a change to the Postgres SKU, for example, affects the one server both databases sit on. Requiring a manual run (reviewed against the automatic `what-if` diff) plus the `prod` approval is the closest equivalent this shared architecture supports: infra never applies without deliberate human review. True dev/prod infra isolation would require separate resource groups (its own Key Vault, Postgres server, App Service per environment) — roughly doubling infra cost and retiring the current slot-swap design in favor of two separate Web Apps. Not implemented; revisit if full isolation becomes a requirement.

---

## 7. Manual operations

### Run migrations against a database

```bash
# Dev
DATABASE_URL="<cityops_dev connection string>" npm run db:migrate:deploy
# Prod
DATABASE_URL="<cityops connection string>" npm run db:migrate:deploy
```

### Seed data (non-production only)

```bash
DATABASE_URL="<cityops_dev connection string>" npm run db:seed
```

### Roll back a production release

Swap the slots back (the previous build is still in the `dev` slot after a swap):

```bash
az webapp deployment slot swap \
  -g rg-cityops -n <WEB_APP_NAME> \
  --slot dev --target-slot production
```

### Verify the deployment

```bash
curl -I https://<WEB_APP_NAME>.azurewebsites.net          # production
curl -I https://<WEB_APP_NAME>-dev.azurewebsites.net       # dev slot
```

---

## 8. Troubleshooting

| Symptom                                                           | Cause / Fix                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SubscriptionIsOverQuotaForSku … Total VMs: 0`                    | No App Service compute quota in that region. Try another region or request a quota increase. Slots also require S1+.                                                                           |
| PostgreSQL `Version should be in: []`                             | Flexible Server SKU not offered in that region. Use a supported region (e.g. `uksouth`) via `dbLocation`.                                                                                      |
| `NetworkAcls is required for this resouce` (Azure OpenAI)         | The `Microsoft.CognitiveServices/accounts` PUT requires `networkAcls` explicitly, even though `what-if` may show it as informational. Ensure `networkAcls.defaultAction` is set in the module. |
| `COPY .next/standalone … not found` (Docker) or missing server.js | `output: 'standalone'` must be set in [`next.config.ts`](../next.config.ts).                                                                                                                   |
| Migration can't reach the DB from the agent                       | Ensure the "Allow Azure services" firewall rule exists, or add the agent IP to the server firewall.                                                                                            |
| Key Vault reference shows unresolved                              | The slot's managed identity needs **Key Vault Secrets User**; confirm the role assignment exists.                                                                                              |
| `next build` fails type-check on config                           | Run `npx tsc --noEmit` locally to catch config type errors before pushing.                                                                                                                     |
| `az devops invoke` errors `could not convert string to float`     | Known bug with revision-numbered preview API versions (e.g. `7.1-preview.1`). Use the bare preview format instead (e.g. `7.2-preview`, no trailing `.N`).                                      |
| `az devops invoke` GET ignores `resourceType`/`resourceId`        | Those are query-string args, not path segments — pass them via `--query-parameters`, not `--route-parameters`.                                                                                 |
| `az devops invoke` JSON output fails to parse (`Expecting value`) | The CLI sometimes prints a `Please wait…` status line before the JSON on stdout; strip the first line, or redirect stdout/stderr to separate files and parse the file directly.                |

### Find a region with App Service quota

```bash
for r in ukwest westeurope northeurope francecentral; do
  echo "== $r =="
  az deployment group what-if -g rg-cityops -f infra/main.bicep -n quotacheck \
    -p location=$r dbLocation=uksouth \
       pgAdminPassword="Throwaway$(openssl rand -hex 8)Aa1" \
       authSecret="throwaway-validate-secret-0123456789abcd" \
    2>&1 | grep -iE "quota|SubscriptionIsOver" || echo "OK (no quota error)"
done
```

---

## 9. Cost & teardown

- **S1 Standard** ≈ **$70/month** (required for slots). To pause costs, downgrade the plan to F1 (this removes slots):

  ```bash
  az appservice plan update -g rg-cityops -n asp-cityops --sku F1
  ```

- **Full teardown** (deletes everything in the resource group — irreversible):

  ```bash
  az group delete -n rg-cityops --yes --no-wait
  ```

> ⚠️ `rg-cityops` may contain other resources. Delete individual resources instead of the whole group if you need to keep them — note that `azopenai-cityops` is now managed by this Bicep template (§3), so it **will** be deleted along with everything else in a full teardown.

---

## 10. Reference files

| File                                                                  | Purpose                                                         |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`infra/main.bicep`](../infra/main.bicep)                             | Infrastructure orchestrator                                     |
| [`infra/modules/keyvault.bicep`](../infra/modules/keyvault.bicep)     | Key Vault module                                                |
| [`infra/modules/postgres.bicep`](../infra/modules/postgres.bicep)     | PostgreSQL Flexible Server module                               |
| [`infra/modules/appservice.bicep`](../infra/modules/appservice.bicep) | App Service (plan + web app + dev slot) module                  |
| [`infra/modules/openai.bicep`](../infra/modules/openai.bicep)         | Azure OpenAI account + model deployment module                  |
| [`.ado/modern/modern-cityops-app.yml`](../.ado/modern/modern-cityops-app.yml)             | App CI/CD (build, test, deploy dev/prod)                        |
| [`.ado/modern/modern-cityops-infra.yml`](../.ado/modern/modern-cityops-infra.yml) | Infrastructure pipeline                                         |
| [`.env.example`](../.env.example)                                     | Full list of runtime environment variables                      |
| [`Dockerfile`](../Dockerfile)                                         | Optional container build (not used for App Service code deploy) |
