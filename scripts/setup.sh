#!/usr/bin/env bash
# CityOps — one-shot bootstrap: Azure infrastructure + Azure DevOps wiring.
#
# Run this on a clean subscription + a clean (empty) Azure DevOps project to reproduce
# everything documented in docs/deployment-guidelines.md: the shared resource group
# (App Service w/ dev slot, PostgreSQL w/ dev+prod databases, one Key Vault, Azure OpenAI),
# the Library variable groups, the 'dev'/'prod' Environments (+ approval on prod), the
# ARM service connection, and pipeline registration for the 4 YAML pipelines.
#
# What this script does NOT do (by design — see docs/deployment-guidelines.md §5 & §9):
#   - Create the Classic Release pipelines (classic-app-release / classic-infra-release).
#     Classic Releases have no YAML/ARM representation; they must be built in the ADO UI.
#     Full click-by-click steps are in docs/deployment-guidelines.md §5.6.
#   - Create the true no-YAML 'classic-ui-app-build' pipeline (UI designer only, same reason).
#   - Attach the 'prod' approval check's approver (needs an interactive Graph identity lookup).
#   - Configure the Branch control / Exclusive lock checks on 'prod' (no safe, verified REST
#     check-type IDs to script blindly — see docs/deployment-guidelines.md §11.2, 2 minutes in the UI).
#   - Change GitHub branch protection on the source repo (a change to shared security controls
#     that shouldn't happen silently inside an infra bootstrap script — see §11.1 for the exact
#     `gh` command to run yourself).
#
# Usage:
#   ./scripts/setup.sh
#
# Interactive by default — prompts for every input below with a sensible default (current
# `az account` subscription, existing `az devops configure` org/project, etc.); press Enter to
# accept the default or type a new value. Pre-set any of these as environment variables to
# change the default shown, or run with stdin non-interactive (e.g. in CI) to skip all prompts
# and use the environment variables / defaults directly:
#   AZURE_SUBSCRIPTION_ID=... ADO_ORG_URL=https://dev.azure.com/<org> ADO_PROJECT=<project> \
#     ./scripts/setup.sh </dev/null
#
# Re-running is safe: every step checks whether its target already exists before creating it.

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (each has a default; all are prompted for interactively — see prompt() below)
# ---------------------------------------------------------------------------
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-cityops}"
LOCATION="${LOCATION:-francecentral}"         # App Service + Key Vault region (confirmed capacity)
DB_LOCATION="${DB_LOCATION:-francecentral}"   # PostgreSQL Flexible Server region (confirmed capacity)
AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"

ADO_ORG_URL="${ADO_ORG_URL:-}"                # e.g. https://dev.azure.com/my-org
ADO_PROJECT="${ADO_PROJECT:-}"                # e.g. CityOps
SERVICE_CONNECTION_NAME="${SERVICE_CONNECTION_NAME:-cityops-azure}"
SP_SCOPE="${SP_SCOPE:-resource-group}"        # 'resource-group' (least privilege) or 'subscription'
                                               # (subscription needed only if you'll target arbitrary
                                               # new resource groups from classic-infra-release, §5.1)
AUTHORIZE_FOR_ALL_PIPELINES="${AUTHORIZE_FOR_ALL_PIPELINES:-false}" # least privilege: off by default
                                               # (§11.2) — leave false and explicitly authorize only
                                               # the pipelines that need this service connection.

# GitHub service connection (optional — only created if GITHUB_PAT is supplied). The repo is
# hosted on GitHub, so the pipelines need this to trigger on push/PR. Needs a PAT with 'repo'
# scope. If omitted, create it manually (§11.1).
GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/zynsys/cityops}"
GITHUB_PAT="${GITHUB_PAT:-}"
GITHUB_SERVICE_CONNECTION_NAME="${GITHUB_SERVICE_CONNECTION_NAME:-cityops-github}"

# Secrets: auto-generated if not supplied. Capture the printed values somewhere safe —
# rotating pgAdminPassword resets the DB admin password; rotating authSecret(Dev)
# invalidates existing sessions in that environment.
PG_ADMIN_PASSWORD="${PG_ADMIN_PASSWORD:-}"
AUTH_SECRET="${AUTH_SECRET:-}"
AUTH_SECRET_DEV="${AUTH_SECRET_DEV:-}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# Prompts for $1 (variable name) with label $2 and default $3, unless stdin isn't a terminal
# (CI / piped input), in which case the default is used silently. Pass "secret" as $4 to mask
# the input (e.g. a PAT) instead of showing it as the default.
prompt() {
  local var_name="$1" label="$2" default_value="$3" mode="${4:-plain}" input
  if [[ ! -t 0 ]]; then
    printf -v "$var_name" '%s' "$default_value"
    return
  fi
  if [[ "$mode" == "secret" ]]; then
    read -r -s -p "$label [$([[ -n "$default_value" ]] && echo '<hidden, press Enter to keep>' || echo 'none, optional')]: " input
    echo
  else
    read -r -p "$label [$default_value]: " input
  fi
  printf -v "$var_name" '%s' "${input:-$default_value}"
}

# ---------------------------------------------------------------------------
# 0. Preflight
# ---------------------------------------------------------------------------
log "Preflight checks"
command -v az >/dev/null || die "Azure CLI not found. Install: https://learn.microsoft.com/cli/azure/install-azure-cli"
az account show >/dev/null 2>&1 || die "Not logged in. Run: az login"
az bicep version >/dev/null 2>&1 || az bicep install

# ---------------------------------------------------------------------------
# 0b. Interactive prompts — defaults come from env vars above, or from the current az/devops
# context where available (current subscription, already-configured org/project).
# ---------------------------------------------------------------------------
log "Configuration (press Enter to accept each default)"
CURRENT_SUB_ID="$(az account show --query id -o tsv 2>/dev/null || true)"
CURRENT_ADO_ORG="$(az devops configure --list 2>/dev/null | sed -n 's/^organization *= *//p' || true)"
CURRENT_ADO_PROJECT="$(az devops configure --list 2>/dev/null | sed -n 's/^project *= *//p' || true)"

prompt AZURE_SUBSCRIPTION_ID "Azure subscription ID" "${AZURE_SUBSCRIPTION_ID:-$CURRENT_SUB_ID}"
prompt RESOURCE_GROUP "Resource group name" "$RESOURCE_GROUP"
prompt LOCATION "App Service / Key Vault region" "$LOCATION"
prompt DB_LOCATION "PostgreSQL region" "$DB_LOCATION"
prompt ADO_ORG_URL "Azure DevOps org URL (blank = Azure infra only, no ADO wiring)" "${ADO_ORG_URL:-$CURRENT_ADO_ORG}"
prompt ADO_PROJECT "Azure DevOps project name" "${ADO_PROJECT:-$CURRENT_ADO_PROJECT}"
if [[ -n "$ADO_ORG_URL" ]]; then
  prompt SERVICE_CONNECTION_NAME "ARM service connection name" "$SERVICE_CONNECTION_NAME"
  prompt SP_SCOPE "Service principal scope (resource-group|subscription)" "$SP_SCOPE"
  prompt AUTHORIZE_FOR_ALL_PIPELINES "Authorize service connection for all pipelines? (true|false)" "$AUTHORIZE_FOR_ALL_PIPELINES"
  prompt GITHUB_REPO_URL "GitHub repository URL" "$GITHUB_REPO_URL"
  prompt GITHUB_PAT "GitHub PAT for the GitHub service connection (optional)" "$GITHUB_PAT" secret
fi

if [[ -n "$AZURE_SUBSCRIPTION_ID" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
log "Using subscription: $SUBSCRIPTION_ID"

DO_ADO=true
if [[ -z "$ADO_ORG_URL" || -z "$ADO_PROJECT" ]]; then
  warn "ADO_ORG_URL / ADO_PROJECT not set — skipping Azure DevOps wiring (Azure infra only)."
  DO_ADO=false
else
  az extension show -n azure-devops >/dev/null 2>&1 || az extension add -n azure-devops -y
  az devops configure --defaults organization="$ADO_ORG_URL" project="$ADO_PROJECT"
fi

# ---------------------------------------------------------------------------
# 1. Generate stable secrets (only if not supplied)
# ---------------------------------------------------------------------------
log "Preparing secrets"
[[ -n "$PG_ADMIN_PASSWORD" ]] || PG_ADMIN_PASSWORD="$(openssl rand -hex 20)Aa1"
[[ -n "$AUTH_SECRET" ]] || AUTH_SECRET="$(openssl rand -base64 32)"
[[ -n "$AUTH_SECRET_DEV" ]] || AUTH_SECRET_DEV="$(openssl rand -base64 32)"

# ---------------------------------------------------------------------------
# 2. Resource group + Bicep deployment
# ---------------------------------------------------------------------------
log "Ensuring resource group '$RESOURCE_GROUP' in $LOCATION"
az group show -n "$RESOURCE_GROUP" >/dev/null 2>&1 || \
  az group create -n "$RESOURCE_GROUP" -l "$LOCATION" -o none

log "Deploying infra/main.bicep (App Service + dev slot, PostgreSQL, Key Vault, Azure OpenAI)"
DEPLOY_OUTPUT="$(az deployment group create \
  -g "$RESOURCE_GROUP" -n cityops-infra \
  -f "$REPO_ROOT/infra/main.bicep" \
  -p location="$LOCATION" dbLocation="$DB_LOCATION" \
     pgAdminPassword="$PG_ADMIN_PASSWORD" \
     authSecret="$AUTH_SECRET" \
     authSecretDev="$AUTH_SECRET_DEV" \
  --query "properties.outputs" -o json)"

WEB_APP_NAME="$(echo "$DEPLOY_OUTPUT" | jq -r '.webAppName.value')"
WEB_APP_URL="$(echo "$DEPLOY_OUTPUT" | jq -r '.webAppUrl.value')"
DEV_SLOT_URL="$(echo "$DEPLOY_OUTPUT" | jq -r '.devSlotUrl.value')"
KEY_VAULT_NAME="$(echo "$DEPLOY_OUTPUT" | jq -r '.keyVaultName.value')"
POSTGRES_FQDN="$(echo "$DEPLOY_OUTPUT" | jq -r '.postgresFqdn.value')"

log "Infra deployed:"
echo "  Web app (prod): $WEB_APP_URL"
echo "  Web app (dev slot): $DEV_SLOT_URL"
echo "  Key Vault: $KEY_VAULT_NAME"
echo "  PostgreSQL: $POSTGRES_FQDN"

if [[ "$DO_ADO" == "false" ]]; then
  log "Done (Azure infra only). Set ADO_ORG_URL/ADO_PROJECT and re-run to wire up Azure DevOps."
  exit 0
fi

# ---------------------------------------------------------------------------
# 3. Service principal + ARM service connection
# ---------------------------------------------------------------------------
log "Creating service principal for the '$SERVICE_CONNECTION_NAME' service connection"
if [[ "$SP_SCOPE" == "subscription" ]]; then
  SP_SCOPE_ID="/subscriptions/$SUBSCRIPTION_ID"
else
  SP_SCOPE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"
fi

EXISTING_SP_ID="$(az ad sp list --display-name "$SERVICE_CONNECTION_NAME" --query '[0].appId' -o tsv 2>/dev/null || true)"
if [[ -n "$EXISTING_SP_ID" && "$EXISTING_SP_ID" != "None" ]]; then
  warn "Service principal '$SERVICE_CONNECTION_NAME' already exists ($EXISTING_SP_ID) — reusing it."
  SP_APP_ID="$EXISTING_SP_ID"
else
  SP_JSON="$(az ad sp create-for-rbac --name "$SERVICE_CONNECTION_NAME" --role Contributor --scopes "$SP_SCOPE_ID" -o json)"
  SP_APP_ID="$(echo "$SP_JSON" | jq -r '.appId')"
fi

# The Bicep template creates Key Vault role assignments, so the SP also needs
# User Access Administrator at the same scope.
az role assignment create --assignee "$SP_APP_ID" --role "User Access Administrator" --scope "$SP_SCOPE_ID" -o none 2>/dev/null || \
  warn "Could not grant User Access Administrator (may already be assigned)."

log "Creating/updating ARM service connection '$SERVICE_CONNECTION_NAME' (workload identity federation)"
if ! az devops service-endpoint list --query "[?name=='$SERVICE_CONNECTION_NAME']" -o tsv | grep -q .; then
  az devops service-endpoint azurerm create \
    --name "$SERVICE_CONNECTION_NAME" \
    --azure-rm-service-principal-id "$SP_APP_ID" \
    --azure-rm-subscription-id "$SUBSCRIPTION_ID" \
    --azure-rm-subscription-name "$(az account show --query name -o tsv)" \
    --azure-rm-tenant-id "$(az account show --query tenantId -o tsv)" \
    -o none || warn "Automatic service connection creation failed — create it manually (§5.1 in the guidelines)."
  SERVICE_ENDPOINT_ID="$(az devops service-endpoint list --query "[?name=='$SERVICE_CONNECTION_NAME'].id" -o tsv)"
  if [[ -n "$SERVICE_ENDPOINT_ID" ]]; then
    # Least privilege by default (§11.2): do NOT grant every pipeline access. If you do want the
    # convenience, opt in explicitly with AUTHORIZE_FOR_ALL_PIPELINES=true.
    az devops service-endpoint update --id "$SERVICE_ENDPOINT_ID" --enable-for-all "$AUTHORIZE_FOR_ALL_PIPELINES" -o none
    if [[ "$AUTHORIZE_FOR_ALL_PIPELINES" != "true" ]]; then
      warn "Service connection is NOT authorized for all pipelines (least privilege). Authorize each"
      warn "pipeline explicitly: Project Settings → Service connections → $SERVICE_CONNECTION_NAME →"
      warn "Security → add 'modern-app' and 'modern-infra' (and Classic Releases once created)."
    fi
  fi
else
  warn "Service connection '$SERVICE_CONNECTION_NAME' already exists — reusing it."
fi

# ---------------------------------------------------------------------------
# 3b. GitHub service connection (optional — needed because the repo lives on GitHub)
# ---------------------------------------------------------------------------
if [[ -n "$GITHUB_PAT" ]]; then
  log "Creating GitHub service connection '$GITHUB_SERVICE_CONNECTION_NAME'"
  if ! az devops service-endpoint list --query "[?name=='$GITHUB_SERVICE_CONNECTION_NAME']" -o tsv | grep -q .; then
    AZURE_DEVOPS_EXT_GITHUB_PAT="$GITHUB_PAT" az devops service-endpoint github create \
      --name "$GITHUB_SERVICE_CONNECTION_NAME" --github-url "$GITHUB_REPO_URL" -o none || \
      warn "GitHub service connection creation failed — create it manually (§11.1)."
  else
    warn "GitHub service connection '$GITHUB_SERVICE_CONNECTION_NAME' already exists — reusing it."
  fi
else
  warn "GITHUB_PAT not set — skipping GitHub service connection (create manually, §11.1)."
fi

# ---------------------------------------------------------------------------
# 4. Variable groups
# ---------------------------------------------------------------------------
log "Creating variable group 'cityops-env' (shared, non-secret config)"
if ! az pipelines variable-group list --query "[?name=='cityops-env']" -o tsv | grep -q .; then
  az pipelines variable-group create --name cityops-env --authorize true \
    --variables azureServiceConnection="$SERVICE_CONNECTION_NAME" resourceGroup="$RESOURCE_GROUP" \
                location="$LOCATION" dbLocation="$DB_LOCATION" -o none
else
  warn "Variable group 'cityops-env' already exists — leaving as-is."
fi

log "Creating variable group 'cityops-infra' (secret provisioning-time values)"
if ! az pipelines variable-group list --query "[?name=='cityops-infra']" -o tsv | grep -q .; then
  VG_ID="$(az pipelines variable-group create --name cityops-infra --authorize true --variables placeholder=placeholder --query id -o tsv)"
  az pipelines variable-group variable delete --group-id "$VG_ID" --name placeholder --yes -o none
  az pipelines variable-group variable create --group-id "$VG_ID" --name pgAdminPassword --value "$PG_ADMIN_PASSWORD" --secret true -o none
  az pipelines variable-group variable create --group-id "$VG_ID" --name authSecret --value "$AUTH_SECRET" --secret true -o none
  az pipelines variable-group variable create --group-id "$VG_ID" --name authSecretDev --value "$AUTH_SECRET_DEV" --secret true -o none
else
  warn "Variable group 'cityops-infra' already exists — leaving as-is (secrets not overwritten)."
fi

# ---------------------------------------------------------------------------
# 5. Environments + approval gate on 'prod'
# ---------------------------------------------------------------------------
log "Creating Environments 'dev' and 'prod'"
API_VERSION="7.2-preview"
for ENV_NAME in dev prod; do
  EXISTS="$(az devops invoke --area pipelines --resource environments --route-parameters project="$ADO_PROJECT" \
    --api-version "$API_VERSION" --query "value[?name=='$ENV_NAME'].id" -o tsv 2>/dev/null || true)"
  if [[ -z "$EXISTS" ]]; then
    az devops invoke --area pipelines --resource environments --route-parameters project="$ADO_PROJECT" \
      --http-method post --in-file /dev/stdin --api-version "$API_VERSION" -o none <<EOF
{ "name": "$ENV_NAME", "description": "CityOps $ENV_NAME" }
EOF
  else
    warn "Environment '$ENV_NAME' already exists — reusing it."
  fi
done

log "NOTE: the 'prod' approval check (approver identity) is not created automatically —"
warn "resolving an approver's Identity storage key requires interactive Graph lookups."
warn "Add it manually: Pipelines → Environments → prod → Approvals and checks → + Add check"
warn "→ Approvals → Timeout 5 minutes → choose approver(s), and set 'Requester cannot approve own"
warn "run' (separation of duties). Full REST alternative in §5.2."

# ---------------------------------------------------------------------------
# 6. Register pipelines
# ---------------------------------------------------------------------------
log "Registering YAML pipelines"
declare -A PIPELINES=(
  [modern-app]=".ado/modern/app.yml"
  [modern-infra]=".ado/modern/infra.yml"
  [classic-app-build]=".ado/classic/app-build.yml"
  [classic-infra-build]=".ado/classic/infra-build.yml"
)
for NAME in "${!PIPELINES[@]}"; do
  if ! az pipelines list --query "[?name=='$NAME']" -o tsv | grep -q .; then
    az pipelines create --name "$NAME" --yml-path "${PIPELINES[$NAME]}" --skip-first-run true -o none
  else
    warn "Pipeline '$NAME' already exists — leaving as-is."
  fi
done

log "Done. Remaining manual steps (documented in docs/deployment-guidelines.md):"
echo "  §5.2   Add the approval check + approver on the 'prod' Environment (set requester-cannot-approve-own-run)."
echo "  §5.6   Build the Classic Release pipelines (classic-app-release, classic-infra-release) in the ADO UI."
echo "  §5.6   Build the no-YAML 'classic-ui-app-build' pipeline in the ADO UI (Classic designer demo)."
echo "  §11.1  Set up GitHub branch protection on main (required PR + required status check)."
echo "  §11.2  Add Branch control + Exclusive lock checks on the 'prod' Environment."
echo "  §11.4  Set pipeline run/artifact retention policy (Project Settings → Pipelines → Settings)."
if [[ "$AUTHORIZE_FOR_ALL_PIPELINES" != "true" ]]; then
  echo "  §11.2  Explicitly authorize 'modern-app'/'modern-infra' to use the '$SERVICE_CONNECTION_NAME' connection."
fi
echo
echo "Secrets generated this run (store them securely — needed again only if you rotate them):"
echo "  pgAdminPassword: $PG_ADMIN_PASSWORD"
echo "  authSecret:      $AUTH_SECRET"
echo "  authSecretDev:   $AUTH_SECRET_DEV"
