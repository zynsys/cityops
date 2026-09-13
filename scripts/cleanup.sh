#!/usr/bin/env bash
# CityOps — teardown counterpart to scripts/setup.sh. Deletes what that script creates, so you
# can re-run setup.sh against a clean subscription.
#
# Azure, Azure DevOps and GitHub cleanup all run by default, so a single confirmed run returns
# every system to its pre-setup state. Set CLEANUP_ADO=false or CLEANUP_GITHUB=false to keep
# either CI provider's configuration in place.
#
# Azure DevOps cleanup removes only the objects setup-ado.sh creates inside the project: the 3
# YAML pipeline definitions (infra-cicd, app-cicd, load-test-cicd), the cityops-env and
# cityops-infra variable groups, the ARM + GitHub service connections, and their service
# principal. The project itself, its repos, boards, work items and artifacts are never touched,
# and the pipeline YAML in git is untouched — only the ADO pipeline definitions are removed.
#
# What this script does NOT do:
#   - Delete the Azure DevOps project itself, or anything in it that setup did not create.
#   - Touch unrelated service connections (e.g. a pre-existing 'Docker Hub' connection) or
#     unrelated resource groups.
#
# Key Vault and Azure OpenAI are soft-deleted by Azure, which keeps their names reserved after
# the resource group is gone. PURGE_SOFT_DELETED=true (the default) purges those two names so
# setup.sh can immediately recreate them; purging waits for resource-group deletion to finish.
#
# Usage:
#   ./scripts/cleanup.sh
#
# Interactive by default (same prompt/defaults mechanism as setup.sh) and requires typing
# "delete" to confirm before anything is removed. Non-interactive (CI / </dev/null) requires
# CONFIRM=delete to proceed, otherwise it aborts.

set -euo pipefail

RESOURCE_GROUP_ENV="${RESOURCE_GROUP:-}"      # explicit caller override, if any (empty = derive from BASE_NAME)
BASE_NAME="${BASE_NAME:-cityops}"
OPENAI_ACCOUNT_NAME="${OPENAI_ACCOUNT_NAME:-}"  # defaults to azopenai-<BASE_NAME> below
DELETE_RESOURCE_GROUP="${DELETE_RESOURCE_GROUP:-true}"
PURGE_SOFT_DELETED="${PURGE_SOFT_DELETED:-true}"
AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"
CLEANUP_ADO="${CLEANUP_ADO:-true}"
ADO_ORG_URL="${ADO_ORG_URL:-}"
ADO_PROJECT="${ADO_PROJECT:-}"
SERVICE_CONNECTION_NAME="${SERVICE_CONNECTION_NAME:-cityops-azure-service-connection}"
# Kept separate from the derived defaults so they can follow the base name entered at the prompt.
GITHUB_SERVICE_CONNECTION_OVERRIDE="${GITHUB_SERVICE_CONNECTION_NAME:-}"
GITHUB_APP_NAME_OVERRIDE="${GITHUB_APP_NAME:-}"
CLEANUP_GITHUB="${CLEANUP_GITHUB:-true}"
GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/zynsys/cityops}"
CONFIRM="${CONFIRM:-}"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

prompt() {
  local var_name="$1" label="$2" default_value="$3" input
  if [[ ! -t 0 ]]; then
    printf -v "$var_name" '%s' "$default_value"
    return
  fi
  read -r -p "$label [$default_value]: " input
  printf -v "$var_name" '%s' "${input:-$default_value}"
}

# Same deterministic naming as setup.sh, so the suggested defaults here match what it created.

# ---------------------------------------------------------------------------
# 0. Preflight + configuration
# ---------------------------------------------------------------------------
log "Preflight checks"
command -v az >/dev/null || die "Azure CLI not found."
command -v jq >/dev/null || die "jq not found."
az account show >/dev/null 2>&1 || die "Not logged in. Run: az login"

CURRENT_SUB_ID="$(az account show --query id -o tsv 2>/dev/null || true)"
CURRENT_ADO_ORG="$(az devops configure --list 2>/dev/null | sed -n 's/^organization *= *//p' || true)"
CURRENT_ADO_PROJECT="$(az devops configure --list 2>/dev/null | sed -n 's/^project *= *//p' || true)"

log "Configuration (press Enter to accept each default)"
prompt AZURE_SUBSCRIPTION_ID "Azure subscription ID" "${AZURE_SUBSCRIPTION_ID:-$CURRENT_SUB_ID}"
prompt BASE_NAME "Base name used when provisioning" "$BASE_NAME"
prompt RESOURCE_GROUP "Resource group to delete" "${RESOURCE_GROUP_ENV:-rg-$BASE_NAME}"
prompt OPENAI_ACCOUNT_NAME "Azure OpenAI account name" "${OPENAI_ACCOUNT_NAME:-azopenai-$BASE_NAME}"
prompt DELETE_RESOURCE_GROUP "Delete the resource group too? (true|false)" "$DELETE_RESOURCE_GROUP"
prompt PURGE_SOFT_DELETED "Purge soft-deleted Key Vault / Azure OpenAI so the names free up? (true|false)" "$PURGE_SOFT_DELETED"
prompt CLEANUP_ADO "Remove Azure DevOps configuration too? (true|false)" "$CLEANUP_ADO"
if [[ "$CLEANUP_ADO" == "true" ]]; then
  prompt ADO_ORG_URL "Azure DevOps org URL" "${ADO_ORG_URL:-$CURRENT_ADO_ORG}"
  prompt ADO_PROJECT "Azure DevOps project name" "${ADO_PROJECT:-$CURRENT_ADO_PROJECT}"
  prompt SERVICE_CONNECTION_NAME "ARM service connection name" "$SERVICE_CONNECTION_NAME"
  prompt GITHUB_SERVICE_CONNECTION_NAME "GitHub service connection name" "${GITHUB_SERVICE_CONNECTION_OVERRIDE:-$BASE_NAME-github-service-connection}"
fi
prompt CLEANUP_GITHUB "Remove GitHub Actions configuration too? (true|false)" "$CLEANUP_GITHUB"
if [[ "$CLEANUP_GITHUB" == "true" ]]; then
  prompt GITHUB_REPO_URL "GitHub repository URL" "$GITHUB_REPO_URL"
  prompt GITHUB_APP_NAME "Entra app registration name for GitHub OIDC" "${GITHUB_APP_NAME_OVERRIDE:-$BASE_NAME-github-actions}"
  GITHUB_REPO_SLUG="$(printf '%s' "$GITHUB_REPO_URL" | sed -E 's#^https://github.com/##; s#\.git$##')"
fi

if [[ -n "$AZURE_SUBSCRIPTION_ID" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

if [[ "$CLEANUP_ADO" == "true" && -n "$ADO_ORG_URL" && -n "$ADO_PROJECT" ]]; then
  az extension show -n azure-devops >/dev/null 2>&1 || az extension add -n azure-devops -y
  az devops configure --defaults organization="$ADO_ORG_URL" project="$ADO_PROJECT"
  DO_ADO=true
else
  DO_ADO=false
fi

# ---------------------------------------------------------------------------
# 0b. Confirm — this is destructive and mostly irreversible.
# ---------------------------------------------------------------------------
log "About to delete:"
echo "  Subscription:        $SUBSCRIPTION_ID"
[[ "$DELETE_RESOURCE_GROUP" == "true" ]] && echo "  Resource group:      $RESOURCE_GROUP (ALL resources inside it)"
[[ "$PURGE_SOFT_DELETED" == "true" ]] && echo "  Purged permanently:  kv-$BASE_NAME, $OPENAI_ACCOUNT_NAME (irreversible — no recovery after this)"
if [[ "$DO_ADO" == "true" ]]; then
  echo "  ADO project:          $ADO_ORG_URL/$ADO_PROJECT (the project itself is NOT deleted)"
  echo "    Pipelines:          infra-cicd, app-cicd, load-test-cicd (definitions only, not the YAML in git)"
  echo "    Variable groups:    cityops-env, cityops-infra"
  echo "    Service connections: $SERVICE_CONNECTION_NAME, $GITHUB_SERVICE_CONNECTION_NAME (+ SP/app registration)"
  echo "    Environments:       dev, prod"
  echo "    Untouched:          repos, boards, work items, and artifacts"
fi
if [[ "$CLEANUP_GITHUB" == "true" ]]; then
  echo "  GitHub repo:          $GITHUB_REPO_SLUG"
  echo "    Secrets:            AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID, PG_ADMIN_PASSWORD, AUTH_SECRET, AUTH_SECRET_DEV"
  echo "    Variables:          AZURE_RESOURCE_GROUP, AZURE_LOCATION, AZURE_DB_LOCATION, AZURE_BASE_NAME, AZURE_OPENAI_ACCOUNT_NAME, ALERT_EMAIL_ADDRESS"
  echo "    Environments:       dev, prod (all others are left untouched)"
  echo "    App registration:   $GITHUB_APP_NAME"
fi

if [[ -t 0 ]]; then
  read -r -p $'\nType "delete" to confirm: ' CONFIRM
fi
[[ "$CONFIRM" == "delete" ]] || die "Not confirmed (expected \"delete\") — aborting, nothing was changed."

# ---------------------------------------------------------------------------
# 1. Azure DevOps cleanup
# ---------------------------------------------------------------------------
if [[ "$DO_ADO" == "true" ]]; then
  log "Deleting pipelines"
  for NAME in infra-cicd app-cicd load-test-cicd; do
    ID="$(az pipelines list --query "[?name=='$NAME'].id | [0]" -o tsv 2>/dev/null || true)"
    if [[ -n "$ID" && "$ID" != "None" ]]; then
      az pipelines delete --id "$ID" --yes \
        && echo "  Deleted pipeline '$NAME' (id=$ID)" \
        || warn "Could not delete pipeline '$NAME' — it may still be referenced by a release. Delete it manually."
    else
      echo "  '$NAME' not found — skipping."
    fi
  done

  log "Deleting variable groups"
  for NAME in cityops-env cityops-infra; do
    ID="$(az pipelines variable-group list --query "[?name=='$NAME'].id | [0]" -o tsv 2>/dev/null || true)"
    if [[ -n "$ID" && "$ID" != "None" ]]; then
      az pipelines variable-group delete --group-id "$ID" --yes -o none \
        && echo "  Deleted variable group '$NAME' (id=$ID)"
    else
      echo "  '$NAME' not found — skipping."
    fi
  done

  log "Deleting service connections"
  for NAME in "$SERVICE_CONNECTION_NAME" "$GITHUB_SERVICE_CONNECTION_NAME"; do
    ID="$(az devops service-endpoint list --query "[?name=='$NAME'].id | [0]" -o tsv 2>/dev/null || true)"
    if [[ -n "$ID" && "$ID" != "None" ]]; then
      az devops service-endpoint delete --id "$ID" --yes -o none \
        && echo "  Deleted service connection '$NAME' (id=$ID)"
    else
      echo "  '$NAME' not found — skipping."
    fi
  done

  log "Deleting the '$SERVICE_CONNECTION_NAME' app registration / service principal"
  SP_APP_ID="$(az ad sp list --display-name "$SERVICE_CONNECTION_NAME" --query '[0].appId' -o tsv 2>/dev/null || true)"
  if [[ -n "$SP_APP_ID" && "$SP_APP_ID" != "None" ]]; then
    az ad sp delete --id "$SP_APP_ID" \
      && echo "  Deleted service principal $SP_APP_ID" \
      || warn "Could not delete service principal $SP_APP_ID — remove it manually in Entra ID if needed."
  else
    echo "  Not found — skipping."
  fi

  log "Deleting Azure DevOps environments 'dev' and 'prod'"
  ADO_ORG_NAME="$(basename "$ADO_ORG_URL")"
  ADO_RESOURCE_ID="499b84ac-1321-427f-aa17-267ca6975798"
  ENVIRONMENTS_URI="https://dev.azure.com/$ADO_ORG_NAME/$ADO_PROJECT/_apis/pipelines/environments"
  for NAME in dev prod; do
    ENV_ID="$(az rest --method get --resource "$ADO_RESOURCE_ID" --url "$ENVIRONMENTS_URI?api-version=7.1" \
      --query "value[?name=='$NAME'].id | [0]" -o tsv 2>/dev/null || true)"
    if [[ -n "$ENV_ID" && "$ENV_ID" != "None" ]]; then
      az rest --method delete --resource "$ADO_RESOURCE_ID" --url "$ENVIRONMENTS_URI/$ENV_ID?api-version=7.1" -o none 2>/dev/null \
        && echo "  Deleted environment '$NAME' (id=$ENV_ID)" \
        || warn "Could not delete environment '$NAME'. Remove it under Pipelines > Environments."
    else
      echo "  '$NAME' not found — skipping."
    fi
  done
fi

# ---------------------------------------------------------------------------
# 2. Azure resource group
# ---------------------------------------------------------------------------
if [[ "$DELETE_RESOURCE_GROUP" == "true" ]]; then
  log "Deleting resource group '$RESOURCE_GROUP'"
  if az group show -n "$RESOURCE_GROUP" >/dev/null 2>&1; then
    if [[ "$PURGE_SOFT_DELETED" == "true" ]]; then
      # Key Vault / Azure OpenAI only enter the soft-deleted state once the group is actually gone.
      echo "  Waiting for deletion to complete (required before purging soft-deleted resources)..."
      az group delete -n "$RESOURCE_GROUP" --yes
      echo "  Deleted."
    else
      az group delete -n "$RESOURCE_GROUP" --yes --no-wait
      echo "  Deletion started (--no-wait) — check progress: az group show -n $RESOURCE_GROUP"
      warn "Names stay reserved until deletion finishes, and soft-deleted Key Vault / Azure OpenAI names remain taken until purged."
    fi
  else
    echo "  '$RESOURCE_GROUP' not found — skipping."
  fi
else
  log "Skipping resource group deletion (DELETE_RESOURCE_GROUP=false)"
fi

# ---------------------------------------------------------------------------
# 3. Purge soft-deleted resources whose names would otherwise stay reserved
# ---------------------------------------------------------------------------
if [[ "$PURGE_SOFT_DELETED" == "true" ]]; then
  KEY_VAULT_NAME="kv-$BASE_NAME"
  log "Purging soft-deleted '$KEY_VAULT_NAME' (Key Vault)"
  KV_LOCATION="$(az keyvault list-deleted --query "[?name=='$KEY_VAULT_NAME'].properties.location | [0]" -o tsv 2>/dev/null || true)"
  if [[ -z "$KV_LOCATION" || "$KV_LOCATION" == "None" ]]; then
    echo "  Not in the soft-deleted list — nothing to purge."
  elif [[ "$(az keyvault list-deleted --query "[?name=='$KEY_VAULT_NAME'].properties.purgeProtectionEnabled | [0]" -o tsv 2>/dev/null || true)" == "true" ]]; then
    warn "Purge protection is enabled on '$KEY_VAULT_NAME' — Azure forbids purging it."
    warn "The name stays reserved until its retention period expires; use a different base name to redeploy sooner."
  else
    az keyvault purge --name "$KEY_VAULT_NAME" --location "$KV_LOCATION" -o none 2>/dev/null \
      && echo "  Purged '$KEY_VAULT_NAME' — the name is now free." \
      || warn "Could not purge '$KEY_VAULT_NAME'. Purge it manually: az keyvault purge --name $KEY_VAULT_NAME --location $KV_LOCATION"
  fi

  log "Purging soft-deleted '$OPENAI_ACCOUNT_NAME' (Azure OpenAI)"
  OPENAI_DELETED="$(az cognitiveservices account list-deleted --query "[?name=='$OPENAI_ACCOUNT_NAME'].{location:location,id:id} | [0]" -o json 2>/dev/null || true)"
  if [[ -z "$OPENAI_DELETED" || "$OPENAI_DELETED" == "null" ]]; then
    echo "  Not in the soft-deleted list — nothing to purge."
  else
    OPENAI_LOCATION="$(printf '%s' "$OPENAI_DELETED" | jq -r '.location')"
    # The originating resource group is only recoverable from the soft-deleted resource ID.
    OPENAI_RG="$(printf '%s' "$OPENAI_DELETED" | jq -r '.id' | sed -n 's#.*/resourceGroups/\([^/]*\)/.*#\1#p')"
    az cognitiveservices account purge --name "$OPENAI_ACCOUNT_NAME" --location "$OPENAI_LOCATION" --resource-group "$OPENAI_RG" -o none 2>/dev/null \
      && echo "  Purged '$OPENAI_ACCOUNT_NAME' — the name is now free." \
      || warn "Could not purge '$OPENAI_ACCOUNT_NAME'. Purge it manually: az cognitiveservices account purge --name $OPENAI_ACCOUNT_NAME --location $OPENAI_LOCATION --resource-group $OPENAI_RG"
  fi
fi

# ---------------------------------------------------------------------------
# 4. GitHub Actions configuration
# ---------------------------------------------------------------------------
if [[ "$CLEANUP_GITHUB" == "true" ]]; then
  if ! command -v gh >/dev/null 2>&1 || ! gh auth status --hostname github.com >/dev/null 2>&1; then
    warn "GitHub CLI is unavailable or not logged in — skipping GitHub cleanup."
  else
    log "Deleting GitHub repository secrets"
    for NAME in AZURE_CLIENT_ID AZURE_TENANT_ID AZURE_SUBSCRIPTION_ID PG_ADMIN_PASSWORD AUTH_SECRET AUTH_SECRET_DEV; do
      gh secret delete "$NAME" --repo "$GITHUB_REPO_SLUG" >/dev/null 2>&1 \
        && echo "  Deleted secret '$NAME'" \
        || echo "  '$NAME' not found — skipping."
    done

    log "Deleting GitHub repository variables"
    for NAME in AZURE_RESOURCE_GROUP AZURE_LOCATION AZURE_DB_LOCATION AZURE_BASE_NAME AZURE_OPENAI_ACCOUNT_NAME ALERT_EMAIL_ADDRESS; do
      gh variable delete "$NAME" --repo "$GITHUB_REPO_SLUG" >/dev/null 2>&1 \
        && echo "  Deleted variable '$NAME'" \
        || echo "  '$NAME' not found — skipping."
    done

    # Only the two environments setup.sh creates; any others in the repo are left alone.
    log "Deleting GitHub environments 'dev' and 'prod'"
    for NAME in dev prod; do
      gh api --method DELETE "repos/$GITHUB_REPO_SLUG/environments/$NAME" --silent >/dev/null 2>&1 \
        && echo "  Deleted environment '$NAME'" \
        || echo "  '$NAME' not found — skipping."
    done

    log "Deleting the '$GITHUB_APP_NAME' app registration"
    GITHUB_APP_ID="$(az ad app list --display-name "$GITHUB_APP_NAME" --query '[0].appId' -o tsv 2>/dev/null || true)"
    if [[ -n "$GITHUB_APP_ID" && "$GITHUB_APP_ID" != "None" ]]; then
      az ad app delete --id "$GITHUB_APP_ID" \
        && echo "  Deleted app registration $GITHUB_APP_ID" \
        || warn "Could not delete app registration $GITHUB_APP_ID — remove it manually in Entra ID."
    else
      echo "  Not found — skipping."
    fi
  fi
fi

log "Done. Run ./scripts/setup.sh to recreate everything from scratch."
