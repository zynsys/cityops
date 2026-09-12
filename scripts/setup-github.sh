#!/usr/bin/env bash
# Configure GitHub Actions for an already selected CityOps Azure deployment: an Entra app
# registration trusted via OIDC, its Azure roles, and the repository secrets/variables.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/zynsys/cityops}"
GITHUB_REPO_SLUG="${GITHUB_REPO_SLUG:-$(printf '%s' "$GITHUB_REPO_URL" | sed -E 's#^https://github.com/##; s#\.git$##')}"
AZURE_BASE_NAME="${AZURE_BASE_NAME:-cityops}"
GITHUB_APP_NAME="${GITHUB_APP_NAME:-$AZURE_BASE_NAME-github-actions}"
AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-$AZURE_BASE_NAME}"
AZURE_LOCATION="${AZURE_LOCATION:-francecentral}"
AZURE_DB_LOCATION="${AZURE_DB_LOCATION:-francecentral}"
AZURE_OPENAI_ACCOUNT_NAME="${AZURE_OPENAI_ACCOUNT_NAME:-azopenai-$AZURE_BASE_NAME}"
ALERT_EMAIL_ADDRESS="${ALERT_EMAIL_ADDRESS:-}"
DEPLOYMENT_PROVIDER="${DEPLOYMENT_PROVIDER:-github}"

for name in PG_ADMIN_PASSWORD AUTH_SECRET AUTH_SECRET_DEV; do
  require_value "$name"
done
require_command az
require_command gh
require_command jq
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."
gh auth status --hostname github.com >/dev/null 2>&1 || die "Not logged in to GitHub. Run 'gh auth login' first."
gh api "repos/$GITHUB_REPO_SLUG" --jq .permissions.admin 2>/dev/null | grep -q true \
  || die "The signed-in GitHub account needs admin permission on '$GITHUB_REPO_SLUG'."

SUBSCRIPTION_ID="$(az account show --query id --output tsv)"
TENANT_ID="$(az account show --query tenantId --output tsv)"

log "Creating or reusing the '$GITHUB_APP_NAME' app registration"
APP_ID="$(az ad app list --display-name "$GITHUB_APP_NAME" --query '[0].appId' --output tsv 2>/dev/null || true)"
if [[ -z "$APP_ID" || "$APP_ID" == "None" ]]; then
  APP_ID="$(az ad app create --display-name "$GITHUB_APP_NAME" --query appId --output tsv)"
  echo "  Created app registration $APP_ID"
else
  echo "  Reusing app registration $APP_ID"
fi

az ad sp show --id "$APP_ID" --output none 2>/dev/null || az ad sp create --id "$APP_ID" --output none
SP_OBJECT_ID="$(az ad sp show --id "$APP_ID" --query id --output tsv)"

log "Adding federated credentials for '$GITHUB_REPO_SLUG'"
add_federated_credential() {
  local name="$1" subject="$2"
  az ad app federated-credential create --id "$APP_ID" --parameters "{
    \"name\": \"$name\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"$subject\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" --output none 2>/dev/null \
    && echo "  Added '$name'" \
    || echo "  '$name' already present — leaving it unchanged."
}
add_federated_credential "$GITHUB_APP_NAME-main" "repo:$GITHUB_REPO_SLUG:ref:refs/heads/main"
add_federated_credential "$GITHUB_APP_NAME-pr" "repo:$GITHUB_REPO_SLUG:pull_request"
add_federated_credential "$GITHUB_APP_NAME-env-dev" "repo:$GITHUB_REPO_SLUG:environment:dev"
add_federated_credential "$GITHUB_APP_NAME-env-prod" "repo:$GITHUB_REPO_SLUG:environment:prod"

log "Granting Azure roles at subscription scope"
for role in "Contributor" "User Access Administrator" "Key Vault Secrets User"; do
  MSYS_NO_PATHCONV=1 az role assignment create \
    --assignee-object-id "$SP_OBJECT_ID" --assignee-principal-type ServicePrincipal \
    --role "$role" --scope "/subscriptions/$SUBSCRIPTION_ID" --output none 2>/dev/null \
    && echo "  Granted '$role'" \
    || echo "  '$role' already assigned."
done

log "Creating GitHub environments 'dev' and 'prod'"
for environment_name in dev prod; do
  gh api --method PUT "repos/$GITHUB_REPO_SLUG/environments/$environment_name" --silent 2>/dev/null \
    && echo "  Ready: $environment_name" \
    || warn "Could not create the '$environment_name' environment."
done

log "Setting repository variables"
set_variable() {
  gh variable set "$1" --repo "$GITHUB_REPO_SLUG" --body "$2" >/dev/null && echo "  $1=$2"
}
set_variable AZURE_RESOURCE_GROUP "$AZURE_RESOURCE_GROUP"
set_variable AZURE_LOCATION "$AZURE_LOCATION"
set_variable AZURE_DB_LOCATION "$AZURE_DB_LOCATION"
set_variable AZURE_BASE_NAME "$AZURE_BASE_NAME"
set_variable AZURE_OPENAI_ACCOUNT_NAME "$AZURE_OPENAI_ACCOUNT_NAME"
set_variable ALERT_EMAIL_ADDRESS "$ALERT_EMAIL_ADDRESS"

log "Setting repository secrets"
set_secret() {
  # Piped via stdin so the value never appears in the process list.
  printf '%s' "$2" | gh secret set "$1" --repo "$GITHUB_REPO_SLUG" >/dev/null && echo "  $1"
}
set_secret AZURE_CLIENT_ID "$APP_ID"
set_secret AZURE_TENANT_ID "$TENANT_ID"
set_secret AZURE_SUBSCRIPTION_ID "$SUBSCRIPTION_ID"
set_secret PG_ADMIN_PASSWORD "$PG_ADMIN_PASSWORD"
set_secret AUTH_SECRET "$AUTH_SECRET"
set_secret AUTH_SECRET_DEV "$AUTH_SECRET_DEV"

# A workflow disabled in the UI stays disabled even once its secrets exist, so reconcile it here.
log "Reconciling workflow state"
if [[ "$DEPLOYMENT_PROVIDER" == "github" ]]; then
  for workflow in app-cicd.yml infra-cicd.yml load-test-cicd.yml; do
    gh workflow enable "$workflow" --repo "$GITHUB_REPO_SLUG" >/dev/null 2>&1 \
      && echo "  Enabled $workflow" \
      || echo "  $workflow already enabled."
  done
else
  for workflow in app-cicd.yml infra-cicd.yml; do
    gh workflow disable "$workflow" --repo "$GITHUB_REPO_SLUG" >/dev/null 2>&1 \
      && echo "  Disabled $workflow (Azure DevOps is the deploying provider)" \
      || echo "  $workflow already disabled."
  done
fi

log "GitHub Actions bootstrap complete"
warn "Add required reviewers to the 'prod' environment: Settings > Environments > prod."
