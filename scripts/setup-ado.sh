#!/usr/bin/env bash
# Configure Azure DevOps integration for an already selected CityOps Azure deployment.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

ADO_ORG_URL="${ADO_ORG_URL:-}"
ADO_PROJECT="${ADO_PROJECT:-}"
SERVICE_CONNECTION_NAME="${SERVICE_CONNECTION_NAME:-cityops-azure-service-connection}"
SP_SCOPE="${SP_SCOPE:-subscription}"
# Pipelines are registered after this connection exists, so they cannot be authorized individually
# here; blanket authorization keeps setup a single working pass. Set false to authorize by hand.
AUTHORIZE_FOR_ALL_PIPELINES="${AUTHORIZE_FOR_ALL_PIPELINES:-true}"
GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/zynsys/cityops}"
GITHUB_PAT="${GITHUB_PAT:-}"
GITHUB_SERVICE_CONNECTION_NAME="${GITHUB_SERVICE_CONNECTION_NAME:-cityops-github-service-connection}"
AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-cityops}"
AZURE_LOCATION="${AZURE_LOCATION:-francecentral}"
AZURE_DB_LOCATION="${AZURE_DB_LOCATION:-francecentral}"
AZURE_BASE_NAME="${AZURE_BASE_NAME:-cityops}"
AZURE_OPENAI_ACCOUNT_NAME="${AZURE_OPENAI_ACCOUNT_NAME:-azopenai-$AZURE_BASE_NAME}"
ALERT_EMAIL_ADDRESS="${ALERT_EMAIL_ADDRESS:-}"

for name in ADO_ORG_URL ADO_PROJECT PG_ADMIN_PASSWORD AUTH_SECRET AUTH_SECRET_DEV; do
  require_value "$name"
done
require_command az
require_command jq
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."

case "$SP_SCOPE" in
  subscription|resource-group) ;;
  *) die "SP_SCOPE must be subscription or resource-group." ;;
esac

set_group_variable() {
  local group_id="$1" name="$2" value="$3" secret="${4:-false}"
  az pipelines variable-group variable update --group-id "$group_id" --name "$name" --value "$value" --secret "$secret" --output none 2>/dev/null || \
    az pipelines variable-group variable create --group-id "$group_id" --name "$name" --value "$value" --secret "$secret" --output none
}

log "Configuring Azure DevOps defaults"
az extension show --name azure-devops >/dev/null 2>&1 || az extension add --name azure-devops --yes
az devops configure --defaults organization="$ADO_ORG_URL" project="$ADO_PROJECT"
SUBSCRIPTION_ID="$(az account show --query id --output tsv)"

log "Creating or reusing deployment service principal"
SP_APP_ID="$(az ad sp list --display-name "$SERVICE_CONNECTION_NAME" --query '[0].appId' --output tsv 2>/dev/null || true)"
if [[ -z "$SP_APP_ID" || "$SP_APP_ID" == "None" ]]; then
  SP_APP_ID="$(az ad sp create-for-rbac --name "$SERVICE_CONNECTION_NAME" --query appId --output tsv)"
else
  warn "Service principal '$SERVICE_CONNECTION_NAME' already exists; reusing it."
fi

if [[ "$SP_SCOPE" == "subscription" ]]; then
  SP_SCOPE_ID="/subscriptions/$SUBSCRIPTION_ID"
else
  SP_SCOPE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$AZURE_RESOURCE_GROUP"
fi

for role in "Contributor" "User Access Administrator" "Key Vault Secrets User"; do
  MSYS_NO_PATHCONV=1 az role assignment create \
    --assignee "$SP_APP_ID" --role "$role" --scope "$SP_SCOPE_ID" --output none 2>/dev/null || \
    warn "Could not grant '$role'; it may already be assigned."
done

log "Creating or reusing ARM service connection '$SERVICE_CONNECTION_NAME'"
SERVICE_ENDPOINT_ID="$(az devops service-endpoint list --query "[?name=='$SERVICE_CONNECTION_NAME'].id | [0]" --output tsv)"
if [[ -z "$SERVICE_ENDPOINT_ID" ]]; then
  SP_SECRET="$(az ad sp credential reset --id "$SP_APP_ID" --query password --output tsv)"
  AZURE_DEVOPS_EXT_AZURE_RM_SERVICE_PRINCIPAL_KEY="$SP_SECRET" az devops service-endpoint azurerm create \
    --name "$SERVICE_CONNECTION_NAME" \
    --azure-rm-service-principal-id "$SP_APP_ID" \
    --azure-rm-subscription-id "$SUBSCRIPTION_ID" \
    --azure-rm-subscription-name "$(az account show --query name --output tsv)" \
    --azure-rm-tenant-id "$(az account show --query tenantId --output tsv)" \
    --output none
  unset SP_SECRET
  SERVICE_ENDPOINT_ID="$(az devops service-endpoint list --query "[?name=='$SERVICE_CONNECTION_NAME'].id | [0]" --output tsv)"
else
  warn "Service connection '$SERVICE_CONNECTION_NAME' already exists; reusing it."
fi

if [[ -n "$SERVICE_ENDPOINT_ID" ]]; then
  az devops service-endpoint update --id "$SERVICE_ENDPOINT_ID" \
    --enable-for-all "$AUTHORIZE_FOR_ALL_PIPELINES" --output none
fi

if [[ -n "$GITHUB_PAT" ]]; then
  log "Creating or reusing GitHub service connection '$GITHUB_SERVICE_CONNECTION_NAME'"
  GITHUB_SC_ID="$(az devops service-endpoint list --query "[?name=='$GITHUB_SERVICE_CONNECTION_NAME'].id | [0]" --output tsv)"
  if [[ -z "$GITHUB_SC_ID" ]]; then
    AZURE_DEVOPS_EXT_GITHUB_PAT="$GITHUB_PAT" az devops service-endpoint github create \
      --name "$GITHUB_SERVICE_CONNECTION_NAME" --github-url "$GITHUB_REPO_URL" --output none
  else
    warn "GitHub service connection '$GITHUB_SERVICE_CONNECTION_NAME' already exists; reusing it."
  fi
else
  warn "No GitHub PAT supplied; skipping GitHub service connection creation."
fi

log "Reconciling variable group 'cityops-env'"
ENV_VG_ID="$(az pipelines variable-group list --query "[?name=='cityops-env'].id | [0]" --output tsv 2>/dev/null || true)"
if [[ -z "$ENV_VG_ID" || "$ENV_VG_ID" == "None" ]]; then
  az pipelines variable-group create --name cityops-env --authorize true \
    --variables resourceGroup="$AZURE_RESOURCE_GROUP" location="$AZURE_LOCATION" \
      dbLocation="$AZURE_DB_LOCATION" baseName="$AZURE_BASE_NAME" \
      openAiAccountName="$AZURE_OPENAI_ACCOUNT_NAME" alertEmailAddress="$ALERT_EMAIL_ADDRESS" \
    --output none
else
  set_group_variable "$ENV_VG_ID" resourceGroup "$AZURE_RESOURCE_GROUP"
  set_group_variable "$ENV_VG_ID" location "$AZURE_LOCATION"
  set_group_variable "$ENV_VG_ID" dbLocation "$AZURE_DB_LOCATION"
  set_group_variable "$ENV_VG_ID" baseName "$AZURE_BASE_NAME"
  set_group_variable "$ENV_VG_ID" openAiAccountName "$AZURE_OPENAI_ACCOUNT_NAME"
  set_group_variable "$ENV_VG_ID" alertEmailAddress "$ALERT_EMAIL_ADDRESS"
fi

log "Reconciling variable group 'cityops-infra'"
INFRA_VG_ID="$(az pipelines variable-group list --query "[?name=='cityops-infra'].id | [0]" --output tsv 2>/dev/null || true)"
if [[ -z "$INFRA_VG_ID" || "$INFRA_VG_ID" == "None" ]]; then
  INFRA_VG_ID="$(az pipelines variable-group create --name cityops-infra --authorize true \
    --variables placeholder=placeholder --query id --output tsv)"
  set_group_variable "$INFRA_VG_ID" pgAdminPassword "$PG_ADMIN_PASSWORD" true
  set_group_variable "$INFRA_VG_ID" authSecret "$AUTH_SECRET" true
  set_group_variable "$INFRA_VG_ID" authSecretDev "$AUTH_SECRET_DEV" true
  az pipelines variable-group variable delete --group-id "$INFRA_VG_ID" --name placeholder --yes --output none
else
  set_group_variable "$INFRA_VG_ID" pgAdminPassword "$PG_ADMIN_PASSWORD" true
  set_group_variable "$INFRA_VG_ID" authSecret "$AUTH_SECRET" true
  set_group_variable "$INFRA_VG_ID" authSecretDev "$AUTH_SECRET_DEV" true
fi

log "Attempting to create Azure DevOps environments"
API_VERSION="7.1"
ADO_ORG_NAME="$(basename "$ADO_ORG_URL")"
ADO_RESOURCE_ID="499b84ac-1321-427f-aa17-267ca6975798"
ENVIRONMENTS_URI="https://dev.azure.com/$ADO_ORG_NAME/$ADO_PROJECT/_apis/pipelines/environments?api-version=$API_VERSION"
for environment_name in dev prod; do
  az rest --method post --resource "$ADO_RESOURCE_ID" --uri "$ENVIRONMENTS_URI" \
    --headers "Content-Type=application/json" \
    --body "{\"name\": \"$environment_name\", \"description\": \"CityOps $environment_name\"}" \
    --output none >/dev/null 2>&1 || \
    warn "Could not create '$environment_name' automatically; create it under Pipelines > Environments."
done

log "Registering Azure DevOps pipelines"
GITHUB_REPO_SLUG="$(printf '%s' "$GITHUB_REPO_URL" | sed -E 's#^https://github.com/##; s#\.git$##')"
PIPELINE_REPO_ARGS=(--repository "$GITHUB_REPO_SLUG" --repository-type github --branch main)
if [[ -n "$GITHUB_PAT" ]]; then
  GITHUB_SC_ID="$(az devops service-endpoint list --query "[?name=='$GITHUB_SERVICE_CONNECTION_NAME'].id | [0]" --output tsv 2>/dev/null || true)"
  [[ -n "$GITHUB_SC_ID" ]] && PIPELINE_REPO_ARGS+=(--service-connection "$GITHUB_SC_ID")
fi

declare -A PIPELINES=(
  [infra-cicd]=".ado/infra-cicd.yml"
  [app-cicd]=".ado/app-cicd.yml"
  [load-test-cicd]=".ado/load-test-cicd.yml"
)
for pipeline_name in "${!PIPELINES[@]}"; do
  if ! az pipelines list --query "[?name=='$pipeline_name']" --output tsv | grep -q .; then
    az pipelines create --name "$pipeline_name" --yml-path "${PIPELINES[$pipeline_name]}" \
      "${PIPELINE_REPO_ARGS[@]}" --skip-first-run true --output none || \
      warn "Could not register '$pipeline_name'; register ${PIPELINES[$pipeline_name]} manually."
  else
    warn "Pipeline '$pipeline_name' already exists; leaving it unchanged."
  fi
done

log "Azure DevOps bootstrap complete"
warn "Manually configure the prod approval, branch control, exclusive lock, retention, and explicit pipeline authorization documented in docs/deployment/azure-devops.md."
