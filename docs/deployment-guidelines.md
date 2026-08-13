# CityOps — Deployment Guidelines

End-to-end instructions to provision the Azure infrastructure and deploy CityOps from scratch, using Bicep (IaC) and Azure DevOps pipelines. Follow this to reproduce the environment on a clean subscription.

---

## 1. Architecture overview

CityOps is a server-side Next.js app (App Router, NextAuth, Prisma) deployed to **Azure App Service** as **code** (no container) using the Next.js **standalone** output (`node server.js`).

| Component | Azure resource | Notes |
| --- | --- | --- |
| Web app (prod) | App Service (Linux, Node 20) — **production slot** | Runs `node server.js` |
| Web app (dev) | App Service **`dev` deployment slot** | Requires Standard (S1)+ |
| Database | Azure Database for **PostgreSQL Flexible Server** + PostGIS | Two DBs: `cityops` (prod), `cityops_dev` (dev) |
| Secrets | Azure Key Vault (RBAC) | `DATABASE-URL`, `DATABASE-URL-DEV`, `AUTH-SECRET` |
| Identity | System-assigned managed identity on the web app + dev slot | Reads Key Vault via `@Microsoft.KeyVault(...)` references |

**Environment → slot → database mapping**

| Environment | Slot | Database | Key Vault secret |
| --- | --- | --- | --- |
| Dev | `dev` | `cityops_dev` | `DATABASE-URL-DEV` |
| Prod | production | `cityops` | `DATABASE-URL` |

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

If you deploy to a fresh subscription, check quota first. To find a region with App Service quota, run a read-only `what-if` per region (see §8 Troubleshooting) and pick one that passes.

> **Deployment slots require Standard (S1) or higher.** Free (F1) and Basic (B1) do **not** support slots.

---

## 3. Provision infrastructure with Bicep

The template is [`infra/main.bicep`](../infra/main.bicep). Key parameters:

| Parameter | Default | Purpose |
| --- | --- | --- |
| `location` | resource group location | App Service + Key Vault region |
| `dbLocation` | `uksouth` | PostgreSQL region (kept separate) |
| `appServiceSkuName` / `appServiceSkuTier` | `S1` / `Standard` | S1+ enables slots |
| `alwaysOn` | `true` | Keep the app warm (Standard+) |
| `devSlotName` | `dev` | Non-production slot |
| `pgAdminPassword` | *(secure)* | PostgreSQL admin password |
| `authSecret` | *(secure)* | NextAuth `AUTH_SECRET` (≥ 32 chars) |

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

Create Pipelines → **Environments**:

- **`dev`** — deploy gate for the dev slot.
- **`prod`** — deploy gate for production; add an **approval check**.
- **`cityops-infra`** — approval gate for infrastructure applies.

### 4.3 Variable group (infra pipeline)

Pipelines → **Library** → variable group **`cityops-infra`** with **secret**, **stable** variables:

- `pgAdminPassword`
- `authSecret`

### 4.4 Register pipelines

Pipelines → New pipeline → Existing YAML file:

| Pipeline | YAML file | Purpose |
| --- | --- | --- |
| `CityOps-CI` | [`.ado/azure-pipelines.yml`](../.ado/azure-pipelines.yml) | App build, tests, coverage, **Deploy_Dev → Deploy_Prod** |
| `CityOps-Infra` | [`.ado/azure-pipelines-infra.yml`](../.ado/azure-pipelines-infra.yml) | Infra **Validate → Deploy** |

---

## 5. Application configuration (env vars)

Runtime configuration mirrors [`.env.example`](../.env.example). In Azure these are set as **App Service application settings**; secrets use **Key Vault references** resolved by the managed identity.

| Variable | Source in Azure | Required |
| --- | --- | --- |
| `DATABASE_URL` | Key Vault reference (`DATABASE-URL` / `DATABASE-URL-DEV`), slot-sticky | ✅ |
| `AUTH_SECRET` | Key Vault reference (`AUTH-SECRET`) | ✅ (prod) |
| `NEXTAUTH_URL` | App setting per slot (slot-sticky) | ✅ (prod) |
| `NODE_ENV` | `production` | ✅ |
| `STORAGE_PROVIDER` | `local` (or `azure` + storage vars) | default `local` |
| `AZURE_OPENAI_*` | App settings / Key Vault (optional, all-or-nothing) | optional |

Config is validated at startup by `validateEnv()` (via `src/instrumentation.ts`); a missing required variable fails fast with a clear message.

---

## 6. Deployment flow (CI/CD)

### 6.1 App pipeline (`CityOps-CI`)

```
Build & Unit tests  →  Integration tests  →  E2E (PR & nightly only)
                                          ↓
                       Deploy_Dev (dev slot, migrate cityops_dev)   [env: dev, approval]
                                          ↓
                       Deploy_Prod (migrate cityops, swap dev→prod) [env: prod, approval]
```

- **Build** produces an environment-agnostic **standalone** artifact (`drop`). No runtime config needed — the Prisma client is lazily instantiated.
- **Deploy_Dev** deploys `drop` to the **dev slot** and runs `db:migrate:deploy` against `cityops_dev`.
- **Deploy_Prod** migrates `cityops` (prod) then **swaps** dev → production (zero-downtime).

Deploys run on **main pushes / manual** only (not on PRs or the nightly schedule).

### 6.2 Infra pipeline (`CityOps-Infra`)

```
Validate (bicep lint + what-if)  →  Deploy (az deployment group create)  [env: cityops-infra, approval]
```

`what-if` is the infra "build/preview"; the apply is the "release". Triggered only when `infra/**` changes.

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

| Symptom | Cause / Fix |
| --- | --- |
| `SubscriptionIsOverQuotaForSku … Total VMs: 0` | No App Service compute quota in that region. Try another region or request a quota increase. Slots also require S1+. |
| PostgreSQL `Version should be in: []` | Flexible Server SKU not offered in that region. Use a supported region (e.g. `uksouth`) via `dbLocation`. |
| `COPY .next/standalone … not found` (Docker) or missing server.js | `output: 'standalone'` must be set in [`next.config.ts`](../next.config.ts). |
| Migration can't reach the DB from the agent | Ensure the "Allow Azure services" firewall rule exists, or add the agent IP to the server firewall. |
| Key Vault reference shows unresolved | The slot's managed identity needs **Key Vault Secrets User**; confirm the role assignment exists. |
| `next build` fails type-check on config | Run `npx tsc --noEmit` locally to catch config type errors before pushing. |

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

> ⚠️ `rg-cityops` may contain other resources (e.g. `azopenai-cityops`). Delete individual resources instead of the whole group if you need to keep them.

---

## 10. Reference files

| File | Purpose |
| --- | --- |
| [`infra/main.bicep`](../infra/main.bicep) | Infrastructure as code |
| [`.ado/azure-pipelines.yml`](../.ado/azure-pipelines.yml) | App CI/CD (build, test, deploy dev/prod) |
| [`.ado/azure-pipelines-infra.yml`](../.ado/azure-pipelines-infra.yml) | Infrastructure pipeline |
| [`.env.example`](../.env.example) | Full list of runtime environment variables |
| [`Dockerfile`](../Dockerfile) | Optional container build (not used for App Service code deploy) |
