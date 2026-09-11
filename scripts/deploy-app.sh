#!/usr/bin/env bash
# Local CityOps application deployment. Deploy dev first; production promotion is explicit.

set -euo pipefail
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/lib/common.sh"

TARGET="${1:-dev}"
AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-cityops}"
AZURE_BASE_NAME="${AZURE_BASE_NAME:-cityops}"
RUN_APP_TESTS="${RUN_APP_TESTS:-true}"
SEED_DATABASE="${SEED_DATABASE:-false}"
CONFIRM_PRODUCTION="${CONFIRM_PRODUCTION:-false}"

require_command az
require_command npm
require_command curl
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."

case "$TARGET" in
  dev|prod) ;;
  *) die "Usage: deploy-app.sh [dev|prod]" ;;
esac

bash "$SCRIPTS_DIR/app/verify-azure-resources.sh"
eval "$(bash "$SCRIPTS_DIR/app/resolve-azure-names.sh" "$AZURE_BASE_NAME")"

log "Installing application dependencies"
bash "$SCRIPTS_DIR/npm-ci.sh"

if [[ "$TARGET" == "dev" ]]; then
  if is_true "$RUN_APP_TESTS"; then
    log "Running application quality gates"
    npm run lint
    npm run test:unit
  fi

  log "Building the standalone application"
  npm run build

  require_command zip
  package_root="$(mktemp -d)"
  trap 'rm -rf "$package_root"' EXIT
  package_dir="$package_root/package"
  package_zip="$package_root/cityops.zip"
  bash "$SCRIPTS_DIR/app/assemble-package.sh" "$package_dir"
  (cd "$package_dir" && zip -qr "$package_zip" .)

  log "Migrating the development database"
  DATABASE_URL="$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name DATABASE-URL-DEV --query value --output tsv)"
  export DATABASE_URL
  npm run db:migrate:deploy
  if is_true "$SEED_DATABASE"; then
    npm run db:seed
  fi

  log "Deploying application package to the dev slot"
  az webapp deploy \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$WEB_APP_NAME" \
    --slot dev \
    --src-path "$package_zip" \
    --type zip \
    --restart true \
    --output none

  bash "$SCRIPTS_DIR/app/smoke-test.sh" "https://$WEB_APP_NAME-dev.azurewebsites.net/api/health"
  log "Development deployment complete: https://$WEB_APP_NAME-dev.azurewebsites.net"
  exit 0
fi

if [[ -t 0 ]]; then
  read -r -p "Promote the current dev slot to production? Type 'promote' to continue: " confirmation
  [[ "$confirmation" == "promote" ]] || die "Production promotion cancelled."
else
  is_true "$CONFIRM_PRODUCTION" || die "Set CONFIRM_PRODUCTION=true for a non-interactive production promotion."
fi

log "Migrating the production database"
DATABASE_URL="$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name DATABASE-URL --query value --output tsv)"
export DATABASE_URL
npm run db:migrate:deploy
if is_true "$SEED_DATABASE"; then
  npm run db:seed
fi

log "Swapping the dev slot into production"
az webapp deployment slot swap \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$WEB_APP_NAME" \
  --slot dev \
  --target-slot production \
  --output none

bash "$SCRIPTS_DIR/app/smoke-test.sh" "https://$WEB_APP_NAME.azurewebsites.net/api/health"
log "Production promotion complete: https://$WEB_APP_NAME.azurewebsites.net"
