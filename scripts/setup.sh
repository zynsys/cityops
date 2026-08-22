#!/usr/bin/env bash
# CityOps — one-shot bootstrap: Azure infrastructure + Azure DevOps wiring.
#
# Run this on a clean subscription + a clean (empty) Azure DevOps project to reproduce
# everything documented in docs/deployment-guidelines.md: the shared resource group
# (App Service w/ dev slot, PostgreSQL w/ dev+prod databases, one Key Vault, Azure OpenAI),
# the Library variable groups, the 'dev'/'prod' Environments (+ approval on prod), the
# ARM service connection, and pipeline registration for the 2 YAML pipelines (infra-cicd, app-cicd).
#
# What this script does NOT do (by design — see docs/deployment-guidelines.md §5 & §9):
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
RESOURCE_GROUP_ENV="${RESOURCE_GROUP:-}"      # explicit caller override, if any (empty = derive from BASE_NAME + hash)
BASE_NAME="${BASE_NAME:-cityops}"                # prefix for all derived resource names (app-<base>-<hash>, kv-<base>-<hash>, rg-<base>-<hash>, azopenai-<base>-<hash>, etc.)
NAME_HASH="${NAME_HASH:-}"                       # resource-name hash suffix override; blank = generate a fresh
                                                  # random 8-char suffix at prompt time. Reuse an existing value
                                                  # to target/update that deployment; leave blank or type a new
                                                  # one to provision a separate, independent deployment.
OPENAI_ACCOUNT_NAME="${OPENAI_ACCOUNT_NAME:-}"  # defaults to azopenai-<BASE_NAME>-<hash> below, once BASE_NAME/hash are known
LOCATION="${LOCATION:-francecentral}"         # App Service + Key Vault region (confirmed capacity)
DB_LOCATION="${DB_LOCATION:-francecentral}"   # PostgreSQL Flexible Server region (confirmed capacity)
AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"

ADO_ORG_URL="${ADO_ORG_URL:-}"                # e.g. https://dev.azure.com/my-org
ADO_PROJECT="${ADO_PROJECT:-}"                # e.g. CityOps
# Must match the literal 'cityops-azure-service-connection' hardcoded in .ado/app-cicd.yml and
# .ado/infra-cicd.yml's azureSubscription: inputs (ADO can't resolve a variable-group macro there —
# see docs/deployment-guidelines.md §5.3). Change this only if you also change both YAML files.
SERVICE_CONNECTION_NAME="${SERVICE_CONNECTION_NAME:-cityops-azure-service-connection}"
SP_SCOPE="${SP_SCOPE:-subscription}"          # infra/main.bicep is subscription-scoped and creates the
                                               # resource group itself, so the pipeline's SP needs
                                               # subscription-scope roles (you can't scope a role to a
                                               # resource group that doesn't exist yet — §3.1).
                                               # 'resource-group' will NOT work for the infra pipeline.
AUTHORIZE_FOR_ALL_PIPELINES="${AUTHORIZE_FOR_ALL_PIPELINES:-false}" # least privilege: off by default
                                               # (§11.2) — leave false and explicitly authorize only
                                               # the pipelines that need this service connection.

# GitHub service connection + pipeline registration both need a PAT (repo is on GitHub, not
# ADO Repos) — without one, §3b and §6 fall back to manual steps. Auto-provisioned below via the
# GitHub CLI ('gh') when available; only truly optional if you plan to do §3b/§6 manually.
GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/zynsys/cityops}"
GITHUB_PAT="${GITHUB_PAT:-}"
GITHUB_SERVICE_CONNECTION_NAME="${GITHUB_SERVICE_CONNECTION_NAME:-cityops-github-service-connection}"

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
    read -r -s -p "$label [$([[ -n "$default_value" ]] && echo '<hidden, press Enter to keep>' || echo 'none')]: " input
    echo
  else
    read -r -p "$label [$default_value]: " input
  fi
  printf -v "$var_name" '%s' "${input:-$default_value}"
}

# Sets a variable-group variable to the given value, creating it first if the group predates
# this variable. Used so re-running against an existing NAME_HASH always reconciles the group
# to the current run's config/secrets instead of leaving stale values in place.
set_group_variable() {
  local group_id="$1" var_name="$2" var_value="$3" secret="${4:-false}"
  az pipelines variable-group variable update --group-id "$group_id" --name "$var_name" --value "$var_value" --secret "$secret" -o none 2>/dev/null || \
    az pipelines variable-group variable create --group-id "$group_id" --name "$var_name" --value "$var_value" --secret "$secret" -o none
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
prompt BASE_NAME "Base name for Azure resources (app-<base>-<hash>, kv-<base>-<hash>, rg-<base>-<hash>, etc.)" "$BASE_NAME"
# Fresh random suffix each run, so pressing Enter always starts a NEW, independent deployment.
# To target/update an existing one, paste its suffix (or pre-set NAME_HASH / the full RESOURCE_GROUP).
# Note: this only names the resource group (and OpenAI account); App Service/Key Vault/Postgres get
# their own suffix from Bicep's uniqueString(resourceGroup().id), read back from the deploy outputs.
DEFAULT_NAME_HASH="$(openssl rand -hex 4)"
prompt NAME_HASH "Resource name hash suffix — reuse an existing value to target/update that deployment, or press Enter to generate a fresh one for a new deployment" "${NAME_HASH:-$DEFAULT_NAME_HASH}"
prompt RESOURCE_GROUP "Resource group name" "${RESOURCE_GROUP_ENV:-rg-$BASE_NAME-$NAME_HASH}"
prompt OPENAI_ACCOUNT_NAME "Azure OpenAI account name" "${OPENAI_ACCOUNT_NAME:-azopenai-$BASE_NAME-$NAME_HASH}"
prompt LOCATION "App Service / Key Vault region" "$LOCATION"
prompt DB_LOCATION "PostgreSQL region" "$DB_LOCATION"
prompt ADO_ORG_URL "Azure DevOps org URL (blank = Azure infra only, no ADO wiring)" "${ADO_ORG_URL:-$CURRENT_ADO_ORG}"
prompt ADO_PROJECT "Azure DevOps project name" "${ADO_PROJECT:-$CURRENT_ADO_PROJECT}"
if [[ -n "$ADO_ORG_URL" ]]; then
  prompt SERVICE_CONNECTION_NAME "ARM service connection name" "$SERVICE_CONNECTION_NAME"
  prompt SP_SCOPE "Service principal scope (resource-group|subscription)" "$SP_SCOPE"
  prompt AUTHORIZE_FOR_ALL_PIPELINES "Authorize service connection for all pipelines? (true|false)" "$AUTHORIZE_FOR_ALL_PIPELINES"
  prompt GITHUB_REPO_URL "GitHub repository URL" "$GITHUB_REPO_URL"
  # Never silently reuse whichever 'gh' CLI account happens to be active — if multiple GitHub
  # accounts are logged into gh, the wrong one's token would misconfigure the service connection
  # without any obvious signal. Show exactly which account it is and require explicit
  # confirmation (default 'y' only for non-interactive/CI runs, where there's no one to ask).
  if [[ -z "$GITHUB_PAT" ]] && command -v gh >/dev/null 2>&1 && gh auth status --hostname github.com >/dev/null 2>&1; then
    GH_ACTIVE_USER="$(gh api user --jq .login 2>/dev/null || true)"
    if [[ -n "$GH_ACTIVE_USER" ]]; then
      prompt USE_GH_TOKEN "Use the active 'gh' CLI account ('$GH_ACTIVE_USER') as the GitHub PAT? Wrong account? Run 'gh auth switch --hostname github.com' first, or answer 'n' to paste a PAT below (y/n)" "y"
      if [[ "$USE_GH_TOKEN" == "y" ]]; then
        GITHUB_PAT="$(gh auth token --hostname github.com 2>/dev/null || true)"
      fi
    fi
  fi
  prompt GITHUB_PAT "GitHub PAT (scopes: repo + admin:repo_hook — the latter installs the CI/PR webhook so pushes trigger the pipeline) for the GitHub service connection + pipeline registration" "$GITHUB_PAT" secret
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
# 2. Bicep deployment (subscription-scoped — main.bicep creates the resource group itself)
# ---------------------------------------------------------------------------
# No manual `az group create`: infra/main.bicep is targetScope='subscription' and creates (or
# adopts) the resource group via its resourcegroup.bicep module, so it's deployed with
# `az deployment sub create` + a resourceGroupName param — exactly what the infra pipeline runs
# (.ado/infra-cicd.yml) and what docs/deployment-guidelines.md §5 documents.
log "Deploying infra/main.bicep (creates resource group '$RESOURCE_GROUP' + App Service + dev slot, PostgreSQL, Key Vault, Azure OpenAI)"
DEPLOY_OUTPUT="$(az deployment sub create \
  --location "$LOCATION" -n cityops-infra \
  -f "$REPO_ROOT/infra/main.bicep" \
  -p resourceGroupName="$RESOURCE_GROUP" \
     location="$LOCATION" dbLocation="$DB_LOCATION" \
     baseName="$BASE_NAME" openAiAccountName="$OPENAI_ACCOUNT_NAME" \
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
  SP_JSON="$(az ad sp create-for-rbac --name "$SERVICE_CONNECTION_NAME" -o json)"
  SP_APP_ID="$(echo "$SP_JSON" | jq -r '.appId')"
fi

# Grant both roles explicitly and idempotently every run — regardless of whether the SP was just
# created or reused, and regardless of whether a previous run's role assignment failed partway
# (e.g. the Git Bash path-mangling bug above) — so a retry always converges to the right state.
# MSYS_NO_PATHCONV=1 is scoped to just these two commands: Git Bash mangles a leading
# "/subscriptions/..." argument into a Windows path, but the same env var breaks local file-path
# arguments (e.g. the bicep -f path above) if exported for the whole script.
MSYS_NO_PATHCONV=1 az role assignment create --assignee "$SP_APP_ID" --role "Contributor" --scope "$SP_SCOPE_ID" -o none 2>/dev/null || \
  warn "Could not grant Contributor (may already be assigned)."
# The Bicep template creates Key Vault role assignments, so the SP also needs
# User Access Administrator at the same scope.
MSYS_NO_PATHCONV=1 az role assignment create --assignee "$SP_APP_ID" --role "User Access Administrator" --scope "$SP_SCOPE_ID" -o none 2>/dev/null || \
  warn "Could not grant User Access Administrator (may already be assigned)."
# Key Vault (RBAC mode) treats secret data-plane ops (get/list) separately from control-plane
# management — Contributor alone does NOT grant them. The pipeline's own AzureKeyVault@2 tasks
# (Fetch dev/prod DB secret in app.yml) run as this SP, not the App Service's managed identity,
# so it needs its own Key Vault Secrets User grant or every deploy fails with 403 Forbidden.
MSYS_NO_PATHCONV=1 az role assignment create --assignee "$SP_APP_ID" --role "Key Vault Secrets User" --scope "$SP_SCOPE_ID" -o none 2>/dev/null || \
  warn "Could not grant Key Vault Secrets User (may already be assigned)."

log "Creating/updating ARM service connection '$SERVICE_CONNECTION_NAME'"
if ! az devops service-endpoint list --query "[?name=='$SERVICE_CONNECTION_NAME']" -o tsv | grep -q .; then
  # az devops service-endpoint azurerm create has no workload-identity-federation flag — it
  # always needs a real client secret (or a cert), else it prompts interactively for one. Rotate
  # a fresh secret non-interactively via the documented env var so this never blocks on input.
  SP_SECRET="$(az ad sp credential reset --id "$SP_APP_ID" --query password -o tsv)"
  AZURE_DEVOPS_EXT_AZURE_RM_SERVICE_PRINCIPAL_KEY="$SP_SECRET" az devops service-endpoint azurerm create \
    --name "$SERVICE_CONNECTION_NAME" \
    --azure-rm-service-principal-id "$SP_APP_ID" \
    --azure-rm-subscription-id "$SUBSCRIPTION_ID" \
    --azure-rm-subscription-name "$(az account show --query name -o tsv)" \
    --azure-rm-tenant-id "$(az account show --query tenantId -o tsv)" \
    -o none || warn "Automatic service connection creation failed — create it manually (§5.1 in the guidelines)."
  unset SP_SECRET
  SERVICE_ENDPOINT_ID="$(az devops service-endpoint list --query "[?name=='$SERVICE_CONNECTION_NAME'].id" -o tsv)"
  if [[ -n "$SERVICE_ENDPOINT_ID" ]]; then
    # Least privilege by default (§11.2): do NOT grant every pipeline access. If you do want the
    # convenience, opt in explicitly with AUTHORIZE_FOR_ALL_PIPELINES=true.
    az devops service-endpoint update --id "$SERVICE_ENDPOINT_ID" --enable-for-all "$AUTHORIZE_FOR_ALL_PIPELINES" -o none
    if [[ "$AUTHORIZE_FOR_ALL_PIPELINES" != "true" ]]; then
      warn "Service connection is NOT authorized for all pipelines (least privilege). Authorize each"
      warn "pipeline explicitly: Project Settings → Service connections → $SERVICE_CONNECTION_NAME →"
      warn "Security → add 'app' and 'infra'."
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
log "Creating/updating variable group 'cityops-env' (shared, non-secret config)"
ENV_VG_ID="$(az pipelines variable-group list --query "[?name=='cityops-env'].id | [0]" -o tsv 2>/dev/null || true)"
if [[ -z "$ENV_VG_ID" || "$ENV_VG_ID" == "None" ]]; then
  az pipelines variable-group create --name cityops-env --authorize true \
    --variables azureServiceConnection="$SERVICE_CONNECTION_NAME" resourceGroup="$RESOURCE_GROUP" \
                location="$LOCATION" dbLocation="$DB_LOCATION" baseName="$BASE_NAME" \
                openAiAccountName="$OPENAI_ACCOUNT_NAME" -o none
else
  # Always reconcile to this run's values — reusing an existing NAME_HASH means "update this
  # deployment", so a stale resourceGroup/baseName/etc. left over from a prior run must not win.
  set_group_variable "$ENV_VG_ID" azureServiceConnection "$SERVICE_CONNECTION_NAME"
  set_group_variable "$ENV_VG_ID" resourceGroup "$RESOURCE_GROUP"
  set_group_variable "$ENV_VG_ID" location "$LOCATION"
  set_group_variable "$ENV_VG_ID" dbLocation "$DB_LOCATION"
  set_group_variable "$ENV_VG_ID" baseName "$BASE_NAME"
  set_group_variable "$ENV_VG_ID" openAiAccountName "$OPENAI_ACCOUNT_NAME"
  warn "Variable group 'cityops-env' already existed — updated its values to match this run."
fi

log "Creating/updating variable group 'cityops-infra' (secret provisioning-time values)"
INFRA_VG_ID="$(az pipelines variable-group list --query "[?name=='cityops-infra'].id | [0]" -o tsv 2>/dev/null || true)"
if [[ -z "$INFRA_VG_ID" || "$INFRA_VG_ID" == "None" ]]; then
  INFRA_VG_ID="$(az pipelines variable-group create --name cityops-infra --authorize true --variables placeholder=placeholder --query id -o tsv)"
  # Add the real secrets before removing the placeholder — a variable group must always
  # have at least one variable, so deleting the placeholder first would be rejected.
  az pipelines variable-group variable create --group-id "$INFRA_VG_ID" --name pgAdminPassword --value "$PG_ADMIN_PASSWORD" --secret true -o none
  az pipelines variable-group variable create --group-id "$INFRA_VG_ID" --name authSecret --value "$AUTH_SECRET" --secret true -o none
  az pipelines variable-group variable create --group-id "$INFRA_VG_ID" --name authSecretDev --value "$AUTH_SECRET_DEV" --secret true -o none
  az pipelines variable-group variable delete --group-id "$INFRA_VG_ID" --name placeholder --yes -o none
else
  # Keep in sync with whatever secrets this run actually deployed to Bicep (§1/§2) — otherwise
  # the pipeline would inject stale secrets that no longer match the live Key Vault/Postgres.
  set_group_variable "$INFRA_VG_ID" pgAdminPassword "$PG_ADMIN_PASSWORD" true
  set_group_variable "$INFRA_VG_ID" authSecret "$AUTH_SECRET" true
  set_group_variable "$INFRA_VG_ID" authSecretDev "$AUTH_SECRET_DEV" true
  warn "Variable group 'cityops-infra' already existed — updated its secrets to match this run."
fi

# ---------------------------------------------------------------------------
# 5. Environments + approval gate on 'prod'
# ---------------------------------------------------------------------------
log "Creating Environments 'dev' and 'prod'"
# Neither 'az devops invoke --resource environments' (rejects every api-version with
# "--resource and --api-version combination is not correct") nor 'az rest' against the
# Environments REST endpoint (returns an HTML sign-in page instead of JSON on MSA-backed orgs —
# AAD resource-token auth isn't accepted the way the azure-devops extension's own auth flow is)
# reliably works. Rather than fail the whole script, try once and fall back to a manual step.
API_VERSION="7.1"
ADO_ORG_NAME="$(basename "$ADO_ORG_URL")"
ADO_RESOURCE_ID="499b84ac-1321-427f-aa17-267ca6975798"
ENVIRONMENTS_URI="https://dev.azure.com/$ADO_ORG_NAME/$ADO_PROJECT/_apis/pipelines/environments?api-version=$API_VERSION"
ENVIRONMENTS_AUTOMATED=true
for ENV_NAME in dev prod; do
  # az rest dumps the raw response body straight to stdout (bypassing -o none) when it can't
  # parse it as JSON — this org returns an HTML sign-in page here, so redirect stdout too.
  if ! az rest --method post --resource "$ADO_RESOURCE_ID" --uri "$ENVIRONMENTS_URI" \
      --headers "Content-Type=application/json" \
      --body "{\"name\": \"$ENV_NAME\", \"description\": \"CityOps $ENV_NAME\"}" -o none >/dev/null 2>&1; then
    ENVIRONMENTS_AUTOMATED=false
  fi
done
if [[ "$ENVIRONMENTS_AUTOMATED" == "false" ]]; then
  warn "Could not create Environments automatically (Azure DevOps REST auth limitation on this org)."
  warn "Create them manually: Pipelines → Environments → New environment → name 'dev', repeat for 'prod'."
fi

log "NOTE: the 'prod' approval check (approver identity) is not created automatically —"
warn "resolving an approver's Identity storage key requires interactive Graph lookups."
warn "Add it manually: Pipelines → Environments → prod → Approvals and checks → + Add check"
warn "→ Approvals → Timeout 5 minutes → choose approver(s), and set 'Requester cannot approve own"
warn "run' (separation of duties). Full REST alternative in §5.2."

# ---------------------------------------------------------------------------
# 6. Register pipelines
# ---------------------------------------------------------------------------
log "Registering YAML pipelines"
# 'infra-cicd' first: it provisions/updates the shared Azure resources (App Service + dev slot,
# PostgreSQL, Key Vault, Azure OpenAI) so 'app-cicd' always has somewhere ready to deploy to.
declare -A PIPELINES=(
  [infra-cicd]=".ado/infra-cicd.yml"
  [app-cicd]=".ado/app-cicd.yml"
)
# The repo lives on GitHub, so auto-detection ("no Azure DevOps remote found") can't resolve the
# source repo — pass it explicitly, plus the GitHub service connection if one was created above.
GITHUB_REPO_SLUG="$(echo "$GITHUB_REPO_URL" | sed -E 's#^https://github.com/##; s#\.git$##')"
PIPELINE_REPO_ARGS=(--repository "$GITHUB_REPO_SLUG" --repository-type github --branch main)
if [[ -n "$GITHUB_PAT" ]]; then
  GITHUB_SC_ID="$(az devops service-endpoint list --query "[?name=='$GITHUB_SERVICE_CONNECTION_NAME'].id" -o tsv 2>/dev/null || true)"
  [[ -n "$GITHUB_SC_ID" ]] && PIPELINE_REPO_ARGS+=(--service-connection "$GITHUB_SC_ID")
fi
for NAME in "${!PIPELINES[@]}"; do
  if ! az pipelines list --query "[?name=='$NAME']" -o tsv | grep -q .; then
    az pipelines create --name "$NAME" --yml-path "${PIPELINES[$NAME]}" \
      "${PIPELINE_REPO_ARGS[@]}" --skip-first-run true -o none || \
      warn "Could not register pipeline '$NAME' automatically — create it manually (§5, New pipeline → GitHub → $GITHUB_REPO_SLUG → Existing YAML → ${PIPELINES[$NAME]})."
  else
    warn "Pipeline '$NAME' already exists — leaving as-is."
  fi
done

log "Done. Remaining manual steps (documented in docs/deployment-guidelines.md):"
echo "  §5.2   Add the approval check + approver on the 'prod' Environment (set requester-cannot-approve-own-run)."
echo "  §11.1  Set up GitHub branch protection on main (required PR + required status check)."
echo "  §11.2  Add Branch control + Exclusive lock checks on the 'prod' Environment."
echo "  §11.4  Set pipeline run/artifact retention policy (Project Settings → Pipelines → Settings)."
if [[ "$AUTHORIZE_FOR_ALL_PIPELINES" != "true" ]]; then
  echo "  §11.2  Explicitly authorize 'app-cicd'/'infra-cicd' to use the '$SERVICE_CONNECTION_NAME' connection."
fi
echo
echo "Secrets generated this run (store them securely — needed again only if you rotate them):"
echo "  pgAdminPassword: $PG_ADMIN_PASSWORD"
echo "  authSecret:      $AUTH_SECRET"
echo "  authSecretDev:   $AUTH_SECRET_DEV"
