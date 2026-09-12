#!/usr/bin/env bash
# Preflight: fail before deployment when a globally unique resource name is taken by another
# tenant. Names already owned by the current subscription are fine — Bicep adopts them.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

AZURE_BASE_NAME="${AZURE_BASE_NAME:-${1:-cityops}}"
AZURE_OPENAI_ACCOUNT_NAME="${AZURE_OPENAI_ACCOUNT_NAME:-azopenai-$AZURE_BASE_NAME}"

require_command az
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."
SUBSCRIPTION_ID="$(az account show --query id --output tsv)"

# The storage account name is 'st<baseName>', and storage allows only 3-24 lowercase alphanumerics.
[[ "$AZURE_BASE_NAME" =~ ^[a-z0-9]+$ ]] \
  || die "Base name '$AZURE_BASE_NAME' must contain only lowercase letters and digits."
(( ${#AZURE_BASE_NAME} <= 22 )) \
  || die "Base name '$AZURE_BASE_NAME' is too long; it must be 22 characters or fewer."

conflicts=0

report() {
  local label="$1" name="$2" available="$3" owned="$4"
  if [[ "$available" == "true" ]]; then
    printf '  %-14s %-28s available\n' "$label" "$name"
  elif [[ "$owned" == "true" ]]; then
    printf '  %-14s %-28s already in this subscription (will be updated)\n' "$label" "$name"
  elif [[ "$available" == "false" ]]; then
    printf '  %-14s %-28s TAKEN by another tenant\n' "$label" "$name"
    conflicts=$((conflicts + 1))
  else
    # An unreachable/throttled availability API must not fail the deployment on its own.
    printf '  %-14s %-28s could not be checked\n' "$label" "$name"
    warn "Name availability for '$name' could not be determined; deployment will report the authoritative result."
  fi
}

check_rest() {
  local provider="$1" api="$2" type="$3" name="$4"
  az rest --method post \
    --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/$provider?api-version=$api" \
    --body "{\"name\":\"$name\",\"type\":\"$type\"}" \
    --query nameAvailable --output tsv 2>/dev/null || echo unknown
}

log "Checking globally unique resource names for base name '$AZURE_BASE_NAME'"

storage_name="st$AZURE_BASE_NAME"
available="$(az storage account check-name --name "$storage_name" --query nameAvailable --output tsv 2>/dev/null || echo unknown)"
owned=false
# Ownership only matters for a name that is already taken, and these lookups are slow.
if [[ "$available" == "false" ]]; then
  az storage account show --name "$storage_name" --output none 2>/dev/null && owned=true
fi
report "Storage" "$storage_name" "$available" "$owned"

app_name="app-$AZURE_BASE_NAME"
available="$(check_rest 'Microsoft.Web/checknameavailability' '2023-12-01' 'Microsoft.Web/sites' "$app_name")"
owned=false
if [[ "$available" == "false" ]]; then
  [[ -n "$(az webapp list --query "[?name=='$app_name'].name" --output tsv 2>/dev/null)" ]] && owned=true
fi
report "Web app" "$app_name" "$available" "$owned"

kv_name="kv-$AZURE_BASE_NAME"
available="$(check_rest 'Microsoft.KeyVault/checkNameAvailability' '2023-07-01' 'Microsoft.KeyVault/vaults' "$kv_name")"
owned=false
if [[ "$available" == "false" ]]; then
  az keyvault show --name "$kv_name" --output none 2>/dev/null && owned=true
fi
report "Key Vault" "$kv_name" "$available" "$owned"

pg_name="pg-$AZURE_BASE_NAME"
available="$(check_rest 'Microsoft.DBforPostgreSQL/checkNameAvailability' '2023-03-01-preview' 'Microsoft.DBforPostgreSQL/flexibleServers' "$pg_name")"
owned=false
if [[ "$available" == "false" ]]; then
  [[ -n "$(az postgres flexible-server list --query "[?name=='$pg_name'].name" --output tsv 2>/dev/null)" ]] && owned=true
fi
report "PostgreSQL" "$pg_name" "$available" "$owned"

if (( conflicts > 0 )); then
  die "$conflicts name(s) are taken by another Azure tenant. Choose a different base name (AZURE_BASE_NAME) and retry."
fi

log "All required names are usable"
