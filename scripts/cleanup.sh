#!/usr/bin/env bash
# CityOps — teardown counterpart to scripts/setup.sh. Deletes everything that script creates,
# so you can re-run setup.sh against a truly clean Azure DevOps project + subscription.
#
# Deletes: the 2 YAML pipelines (infra-cicd, app-cicd), both Library variable groups (cityops-env,
# cityops-infra), the ARM + GitHub service connections and their service principal/app
# registration, and (unless DELETE_RESOURCE_GROUP=false) the Azure resource group itself. The
# Azure DevOps project itself is never deleted — only the resources setup.sh created inside it.
#
# What this script does NOT do:
#   - Delete the 'dev'/'prod' Environments. The azure-devops CLI extension has no working
#     list/delete command or `az devops invoke` route for Pipelines Environments — delete them
#     manually: Pipelines → Environments → select each → ⋮ → Delete (under a minute).
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
ADO_ORG_URL="${ADO_ORG_URL:-}"
ADO_PROJECT="${ADO_PROJECT:-}"
SERVICE_CONNECTION_NAME="${SERVICE_CONNECTION_NAME:-cityops-azure-service-connection}"
GITHUB_SERVICE_CONNECTION_NAME="${GITHUB_SERVICE_CONNECTION_NAME:-cityops-github-service-connection}"
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
prompt ADO_ORG_URL "Azure DevOps org URL (blank = skip ADO cleanup)" "${ADO_ORG_URL:-$CURRENT_ADO_ORG}"
prompt ADO_PROJECT "Azure DevOps project name" "${ADO_PROJECT:-$CURRENT_ADO_PROJECT}"
if [[ -n "$ADO_ORG_URL" ]]; then
  prompt SERVICE_CONNECTION_NAME "ARM service connection name" "$SERVICE_CONNECTION_NAME"
  prompt GITHUB_SERVICE_CONNECTION_NAME "GitHub service connection name" "$GITHUB_SERVICE_CONNECTION_NAME"
fi

if [[ -n "$AZURE_SUBSCRIPTION_ID" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

if [[ -n "$ADO_ORG_URL" && -n "$ADO_PROJECT" ]]; then
  az extension show -n azure-devops >/dev/null 2>&1 || az extension add -n azure-devops -y
  az devops configure --defaults organization="$ADO_ORG_URL" project="$ADO_PROJECT"
  DO_ADO=true
else
  warn "ADO_ORG_URL / ADO_PROJECT not set — skipping Azure DevOps cleanup (Azure infra only)."
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
  echo "  ADO project (NOT deleted — only these resources within it): $ADO_ORG_URL/$ADO_PROJECT"
  echo "  Pipelines:            infra-cicd, app-cicd"
  echo "  Variable groups:      cityops-env, cityops-infra"
  echo "  Service connections:  $SERVICE_CONNECTION_NAME, $GITHUB_SERVICE_CONNECTION_NAME (+ SP/app registration)"
fi
echo "  NOT deleted: the ADO project itself, or 'dev'/'prod' Environments (delete Environments manually — see header comment)."

if [[ -t 0 ]]; then
  read -r -p $'\nType "delete" to confirm: ' CONFIRM
fi
[[ "$CONFIRM" == "delete" ]] || die "Not confirmed (expected \"delete\") — aborting, nothing was changed."

# ---------------------------------------------------------------------------
# 1. Azure DevOps cleanup
# ---------------------------------------------------------------------------
if [[ "$DO_ADO" == "true" ]]; then
  log "Deleting pipelines"
  for NAME in infra-cicd app-cicd; do
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

  warn "Reminder: 'dev'/'prod' Environments were NOT deleted (no reliable CLI/REST route)."
  warn "Delete manually: Pipelines → Environments → select each → ⋮ → Delete."
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

log "Done. Run ./scripts/setup.sh to recreate everything from scratch."
