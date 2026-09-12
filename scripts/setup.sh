#!/usr/bin/env bash
# Interactive CityOps Azure bootstrap. Infrastructure is deployed through scripts/infra/deploy.sh;
# optional CI configuration is delegated to scripts/setup-ado.sh and scripts/setup-github.sh.

set -euo pipefail
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/lib/common.sh"

prompt() {
  local variable_name="$1" label="$2" default_value="$3" mode="${4:-plain}" input
  if [[ ! -t 0 ]]; then
    printf -v "$variable_name" '%s' "$default_value"
    return
  fi
  if [[ "$mode" == "secret" ]]; then
    read -r -s -p "$label [$([[ -n "$default_value" ]] && echo '<hidden, press Enter to keep>' || echo 'none')]: " input
    echo
  else
    read -r -p "$label [$default_value]: " input
  fi
  printf -v "$variable_name" '%s' "${input:-$default_value}"
}

confirm() {
  local variable_name="$1" label="$2" default_value="$3" answer
  prompt answer "$label (y/n)" "$default_value"
  case "${answer,,}" in
    1|true|y|yes) printf -v "$variable_name" '%s' true ;;
    0|false|n|no) printf -v "$variable_name" '%s' false ;;
    *) die "$label must be answered y or n." ;;
  esac
}

log "Preflight checks"
for command_name in az jq openssl; do
  require_command "$command_name"
done
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."
az bicep version >/dev/null 2>&1 || az bicep install

CURRENT_SUBSCRIPTION_ID="$(az account show --query id --output tsv)"
CURRENT_USER_EMAIL="$(az ad signed-in-user show --query mail --output tsv 2>/dev/null || true)"
if [[ -z "$CURRENT_USER_EMAIL" || "$CURRENT_USER_EMAIL" == "None" ]]; then
  CURRENT_USER_EMAIL="$(az account show --query user.name --output tsv 2>/dev/null || true)"
fi

AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-$CURRENT_SUBSCRIPTION_ID}"
AZURE_BASE_NAME="${AZURE_BASE_NAME:-${BASE_NAME:-cityops}}"
# Kept separate from the derived defaults so they can follow the base name entered at the prompt.
RESOURCE_GROUP_OVERRIDE="${AZURE_RESOURCE_GROUP:-${RESOURCE_GROUP:-}}"
OPENAI_ACCOUNT_OVERRIDE="${AZURE_OPENAI_ACCOUNT_NAME:-${OPENAI_ACCOUNT_NAME:-}}"
AZURE_LOCATION="${AZURE_LOCATION:-${LOCATION:-francecentral}}"
AZURE_DB_LOCATION="${AZURE_DB_LOCATION:-${DB_LOCATION:-francecentral}}"
ALERT_EMAIL_ADDRESS="${ALERT_EMAIL_ADDRESS:-$CURRENT_USER_EMAIL}"
CONFIGURE_ADO="${CONFIGURE_ADO:-n}"
CONFIGURE_GITHUB="${CONFIGURE_GITHUB:-n}"
RUN_WHAT_IF="${RUN_WHAT_IF:-y}"
CONFIRM_DEPLOY="${CONFIRM_DEPLOY:-}"
RUN_INFRA_SMOKE_TEST="${RUN_INFRA_SMOKE_TEST:-y}"
DEPLOY_APP="${DEPLOY_APP:-n}"

log "Configuration (press Enter to accept each default)"
prompt AZURE_SUBSCRIPTION_ID "Azure subscription ID" "$AZURE_SUBSCRIPTION_ID"
prompt AZURE_BASE_NAME "Base name for Azure resources (globally unique, lowercase letters and digits)" "$AZURE_BASE_NAME"
prompt AZURE_RESOURCE_GROUP "Resource group name" "${RESOURCE_GROUP_OVERRIDE:-rg-$AZURE_BASE_NAME}"
prompt AZURE_OPENAI_ACCOUNT_NAME "Azure OpenAI account name" "${OPENAI_ACCOUNT_OVERRIDE:-azopenai-$AZURE_BASE_NAME}"
prompt AZURE_LOCATION "App Service / Key Vault region" "$AZURE_LOCATION"
prompt AZURE_DB_LOCATION "PostgreSQL region" "$AZURE_DB_LOCATION"
prompt ALERT_EMAIL_ADDRESS "Alert email address (blank disables alerts)" "$ALERT_EMAIL_ADDRESS"
confirm DO_ADO "Configure Azure DevOps integration?" "$CONFIGURE_ADO"
confirm DO_GITHUB "Configure GitHub Actions integration?" "$CONFIGURE_GITHUB"

if [[ "$DO_GITHUB" == "true" ]]; then
  GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/zynsys/cityops}"
  GITHUB_APP_NAME="${GITHUB_APP_NAME:-cityops-github-actions}"
  prompt GITHUB_REPO_URL "GitHub repository URL" "$GITHUB_REPO_URL"
  prompt GITHUB_APP_NAME "Entra app registration name for GitHub OIDC" "$GITHUB_APP_NAME"
fi

if [[ "$DO_ADO" == "true" ]]; then
  CURRENT_ADO_ORG="$(az devops configure --list 2>/dev/null | sed -n 's/^organization *= *//p' || true)"
  CURRENT_ADO_PROJECT="$(az devops configure --list 2>/dev/null | sed -n 's/^project *= *//p' || true)"
  ADO_ORG_URL="${ADO_ORG_URL:-$CURRENT_ADO_ORG}"
  ADO_PROJECT="${ADO_PROJECT:-$CURRENT_ADO_PROJECT}"
  SERVICE_CONNECTION_NAME="${SERVICE_CONNECTION_NAME:-cityops-azure-service-connection}"
  SP_SCOPE="${SP_SCOPE:-subscription}"
  AUTHORIZE_FOR_ALL_PIPELINES="${AUTHORIZE_FOR_ALL_PIPELINES:-false}"
  GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/zynsys/cityops}"
  GITHUB_PAT="${GITHUB_PAT:-}"
  GITHUB_SERVICE_CONNECTION_NAME="${GITHUB_SERVICE_CONNECTION_NAME:-cityops-github-service-connection}"

  prompt ADO_ORG_URL "Azure DevOps org URL" "$ADO_ORG_URL"
  prompt ADO_PROJECT "Azure DevOps project name" "$ADO_PROJECT"
  prompt SERVICE_CONNECTION_NAME "ARM service connection name" "$SERVICE_CONNECTION_NAME"
  prompt SP_SCOPE "Service principal scope (subscription|resource-group)" "$SP_SCOPE"
  prompt AUTHORIZE_FOR_ALL_PIPELINES "Authorize service connection for all pipelines? (true|false)" "$AUTHORIZE_FOR_ALL_PIPELINES"
  prompt GITHUB_REPO_URL "GitHub repository URL" "$GITHUB_REPO_URL"
  if [[ -z "$GITHUB_PAT" ]] && command -v gh >/dev/null 2>&1 && gh auth status --hostname github.com >/dev/null 2>&1; then
    GH_ACTIVE_USER="$(gh api user --jq .login 2>/dev/null || true)"
    if [[ -n "$GH_ACTIVE_USER" ]]; then
      confirm USE_GH_TOKEN "Use active gh account '$GH_ACTIVE_USER' for the ADO GitHub connection?" "y"
      [[ "$USE_GH_TOKEN" == "true" ]] && GITHUB_PAT="$(gh auth token --hostname github.com 2>/dev/null || true)"
    fi
  fi
  prompt GITHUB_PAT "GitHub PAT for ADO pipeline registration (optional)" "$GITHUB_PAT" secret
fi

if [[ -n "$AZURE_SUBSCRIPTION_ID" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi
log "Target subscription: $(az account show --query name --output tsv) ($AZURE_SUBSCRIPTION_ID)"

log "Preparing stable provisioning secrets"
PG_ADMIN_PASSWORD="${PG_ADMIN_PASSWORD:-$(openssl rand -hex 20)Aa1}"
AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -base64 32)}"
AUTH_SECRET_DEV="${AUTH_SECRET_DEV:-$(openssl rand -base64 32)}"

export AZURE_SUBSCRIPTION_ID AZURE_RESOURCE_GROUP AZURE_LOCATION AZURE_DB_LOCATION
export AZURE_BASE_NAME AZURE_OPENAI_ACCOUNT_NAME ALERT_EMAIL_ADDRESS
export PG_ADMIN_PASSWORD AUTH_SECRET AUTH_SECRET_DEV

bash "$SCRIPTS_DIR/infra/deploy.sh" validate

if is_true "$RUN_WHAT_IF"; then
  bash "$SCRIPTS_DIR/infra/deploy.sh" what-if
fi

if [[ -t 0 ]]; then
  confirm DEPLOY_APPROVED "Apply this infrastructure deployment?" "n"
else
  DEPLOY_APPROVED=false
  is_true "$CONFIRM_DEPLOY" && DEPLOY_APPROVED=true
fi
[[ "$DEPLOY_APPROVED" == "true" ]] || die "Deployment cancelled. Set CONFIRM_DEPLOY=true for an explicit non-interactive apply."

bash "$SCRIPTS_DIR/infra/deploy.sh" deploy

if is_true "$RUN_INFRA_SMOKE_TEST"; then
  if command -v pwsh >/dev/null 2>&1; then
    bash "$SCRIPTS_DIR/infra/smoke-test.sh"
  else
    warn "PowerShell was not found; skipping Pester infrastructure smoke tests."
  fi
fi

if [[ "$DO_ADO" == "true" ]]; then
  export ADO_ORG_URL ADO_PROJECT SERVICE_CONNECTION_NAME SP_SCOPE AUTHORIZE_FOR_ALL_PIPELINES
  export GITHUB_REPO_URL GITHUB_PAT GITHUB_SERVICE_CONNECTION_NAME
  bash "$SCRIPTS_DIR/setup-ado.sh"
fi

if [[ "$DO_GITHUB" == "true" ]]; then
  export GITHUB_REPO_URL GITHUB_APP_NAME
  bash "$SCRIPTS_DIR/setup-github.sh"
fi

confirm DEPLOY_APP_APPROVED "Build and deploy the application to the dev slot now?" "$DEPLOY_APP"
if [[ "$DEPLOY_APP_APPROVED" == "true" ]]; then
  bash "$SCRIPTS_DIR/deploy-app.sh" dev
fi

log "Setup complete"
echo "  Infrastructure outputs: $REPO_ROOT/infra-outputs.json"
echo "  Web app: https://app-$AZURE_BASE_NAME.azurewebsites.net"
echo "  Dev slot: https://app-$AZURE_BASE_NAME-dev.azurewebsites.net"
echo
echo "Store these generated values securely before rerunning setup.sh:"
echo "  PG_ADMIN_PASSWORD=$PG_ADMIN_PASSWORD"
echo "  AUTH_SECRET=$AUTH_SECRET"
echo "  AUTH_SECRET_DEV=$AUTH_SECRET_DEV"
