#!/usr/bin/env bash
# Canonical CityOps Bicep entry point used by local, GitHub Actions, and Azure DevOps deployments.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

OPERATION="${1:-deploy}"
OUTPUT_FILE="${INFRA_OUTPUT_FILE:-$REPO_ROOT/infra-outputs.json}"
DEPLOYMENT_NAME="${AZURE_DEPLOYMENT_NAME:-cityops-infra}"

AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-cityops}"
AZURE_LOCATION="${AZURE_LOCATION:-francecentral}"
AZURE_DB_LOCATION="${AZURE_DB_LOCATION:-francecentral}"
AZURE_BASE_NAME="${AZURE_BASE_NAME:-cityops}"
AZURE_OPENAI_ACCOUNT_NAME="${AZURE_OPENAI_ACCOUNT_NAME:-azopenai-$AZURE_BASE_NAME}"
ALERT_EMAIL_ADDRESS="${ALERT_EMAIL_ADDRESS:-}"
AZURE_RELEASE_DEV_PRINCIPAL_ID="${AZURE_RELEASE_DEV_PRINCIPAL_ID:-}"
AZURE_RELEASE_PROD_PRINCIPAL_ID="${AZURE_RELEASE_PROD_PRINCIPAL_ID:-}"
# ProviderNoRbac lets a read-only identity preview changes (Azure CLI 2.76+); apply always uses full RBAC checks.
AZURE_WHATIF_VALIDATION_LEVEL="${AZURE_WHATIF_VALIDATION_LEVEL:-Provider}"

require_command az
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."

case "$OPERATION" in
  validate)
    log "Compiling infra/main.bicep"
    az bicep build --file "$REPO_ROOT/infra/main.bicep" --stdout >/dev/null
    log "Bicep validation passed"
    bash "$SCRIPTS_DIR/infra/check-names.sh"
    exit 0
    ;;
  what-if|deploy)
    require_value PG_ADMIN_PASSWORD
    require_value AUTH_SECRET
    require_value AUTH_SECRET_DEV
    ;;
  *)
    die "Unknown operation '$OPERATION'. Use validate, what-if, or deploy."
    ;;
esac

PARAMETERS=(
  resourceGroupName="$AZURE_RESOURCE_GROUP"
  location="$AZURE_LOCATION"
  dbLocation="$AZURE_DB_LOCATION"
  baseName="$AZURE_BASE_NAME"
  openAiAccountName="$AZURE_OPENAI_ACCOUNT_NAME"
  alertEmailAddress="$ALERT_EMAIL_ADDRESS"
  devReleasePrincipalId="$AZURE_RELEASE_DEV_PRINCIPAL_ID"
  prodReleasePrincipalId="$AZURE_RELEASE_PROD_PRINCIPAL_ID"
  pgAdminPassword="$PG_ADMIN_PASSWORD"
  authSecret="$AUTH_SECRET"
  authSecretDev="$AUTH_SECRET_DEV"
)

if [[ "$OPERATION" == "what-if" ]]; then
  log "Previewing deployment '$DEPLOYMENT_NAME' in subscription $(az account show --query name -o tsv)"
  az deployment sub what-if \
    --location "$AZURE_LOCATION" \
    --name "$DEPLOYMENT_NAME" \
    --template-file "$REPO_ROOT/infra/main.bicep" \
    --validation-level "$AZURE_WHATIF_VALIDATION_LEVEL" \
    --parameters "${PARAMETERS[@]}"
  exit 0
fi

log "Deploying '$DEPLOYMENT_NAME' to resource group '$AZURE_RESOURCE_GROUP'"
mkdir -p "$(dirname "$OUTPUT_FILE")"
az deployment sub create \
  --location "$AZURE_LOCATION" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$REPO_ROOT/infra/main.bicep" \
  --parameters "${PARAMETERS[@]}" \
  --query properties.outputs \
  --output json | tee "$OUTPUT_FILE"

log "Deployment outputs written to $OUTPUT_FILE"
