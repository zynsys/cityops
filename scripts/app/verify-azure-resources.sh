#!/usr/bin/env bash
# Fail fast when the Azure resources required for application deployment do not exist.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-${1:-}}"
AZURE_BASE_NAME="${AZURE_BASE_NAME:-${2:-cityops}}"

require_command az
require_value AZURE_RESOURCE_GROUP
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."

eval "$(bash "$SCRIPTS_DIR/app/resolve-azure-names.sh" "$AZURE_BASE_NAME")"
az webapp show --resource-group "$AZURE_RESOURCE_GROUP" --name "$WEB_APP_NAME" --output none \
  || die "Web app '$WEB_APP_NAME' was not found in resource group '$AZURE_RESOURCE_GROUP'. Run an infrastructure deployment first."
az keyvault show --name "$KEY_VAULT_NAME" --output none \
  || die "Key Vault '$KEY_VAULT_NAME' was not found. Run an infrastructure deployment first."

log "Verified web app '$WEB_APP_NAME' and Key Vault '$KEY_VAULT_NAME'"
