#!/usr/bin/env bash
# Idempotent GitHub Actions bootstrap for one CityOps Azure environment.
# Creates four OIDC identities (no client secrets), each trusted by exactly one GitHub
# environment, assigns their Azure roles, and configures environments, variables and secrets.
#
#   azure-readonly  Reader + "<base> deployment preview" custom role (what-if, policy scan)
#   infra           Contributor, Resource Policy Contributor, RBAC Administrator (role-constrained)
#   dev / prod      App release identities; Bicep grants their slot/site-scoped roles
#
# Re-running is safe: existing objects are reused and reconciled to the desired state.
# See docs/deployment/github-actions-setup.md.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"
export MSYS_NO_PATHCONV=1 # Git Bash: do not rewrite /subscriptions/... arguments

GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/zynsys/cityops}"
GITHUB_REPO_SLUG="${GITHUB_REPO_SLUG:-$(printf '%s' "$GITHUB_REPO_URL" | sed -E 's#^https://github.com/##; s#\.git$##')}"
AZURE_BASE_NAME="${AZURE_BASE_NAME:-cityops}"
AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-$AZURE_BASE_NAME}"
AZURE_LOCATION="${AZURE_LOCATION:-francecentral}"
AZURE_DB_LOCATION="${AZURE_DB_LOCATION:-$AZURE_LOCATION}"
AZURE_OPENAI_ACCOUNT_NAME="${AZURE_OPENAI_ACCOUNT_NAME:-azopenai-$AZURE_BASE_NAME}"
ALERT_EMAIL_ADDRESS="${ALERT_EMAIL_ADDRESS:-}"
GITHUB_APPROVERS="${GITHUB_APPROVERS:-}"          # comma-separated: user logins and/or org/team-slug
ALLOW_SELF_APPROVAL="${ALLOW_SELF_APPROVAL:-false}" # demo only: approvers may approve their own runs
ENABLE_GITHUB_WORKFLOWS="${ENABLE_GITHUB_WORKFLOWS:-true}"

READONLY_ENV="azure-readonly"
INFRA_ENV="infra"
PREVIEW_ROLE_NAME="$AZURE_BASE_NAME deployment preview"
RBAC_ADMIN_ROLE_ID="f58310d9-a9f6-439a-9e8d-f62e7b41a168" # Role Based Access Control Administrator
# Roles the infra identity may grant/remove (must match role assignments in infra/modules/resources.bicep).
DELEGATABLE_ROLE_IDS=(
  4633458b-17de-408a-b874-0445c86b69e6 # Key Vault Secrets User
  5e0bd9bd-7b93-4f28-af87-19fc36ad61bd # Cognitive Services OpenAI User
  de139f84-1756-47ae-9be6-808fbbbdf0ee # Website Contributor
  acdd72a7-3385-48ef-bd42-f606fba81ae7 # Reader
  ba92f5b4-2d11-453d-a403-e96b0029c9fe # Storage Blob Data Contributor
)
LEGACY_REPO_SECRETS=(AZURE_CLIENT_ID AZURE_TENANT_ID AZURE_SUBSCRIPTION_ID PG_ADMIN_PASSWORD AUTH_SECRET AUTH_SECRET_DEV)
INFRA_SECRETS=(PG_ADMIN_PASSWORD AUTH_SECRET AUTH_SECRET_DEV)
PG_ADMIN_LOGIN="${PG_ADMIN_LOGIN:-cityopsadmin}" # must match pgAdminLogin in infra/main.bicep

[[ "$AZURE_BASE_NAME" =~ ^[a-z0-9]{3,16}$ ]] || die "AZURE_BASE_NAME must be 3-16 lowercase letters/digits."
require_value ALERT_EMAIL_ADDRESS
require_command az
require_command gh
require_command jq
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."
gh auth status --hostname github.com >/dev/null 2>&1 || die "Not logged in to GitHub. Run 'gh auth login' first."
gh api "repos/$GITHUB_REPO_SLUG" --jq .permissions.admin 2>/dev/null | grep -q true \
  || die "The signed-in GitHub account needs admin permission on '$GITHUB_REPO_SLUG'."

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# Strip CR so Windows az.cmd/jq output is safe to compare and reuse.
az_tsv() { az "$@" --output tsv | tr -d '\r'; }
az_json() { az "$@" --output json; }
native_path() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }
new_uuid() {
  if command -v uuidgen >/dev/null 2>&1; then uuidgen | tr 'A-Z' 'a-z'
  elif [[ -r /proc/sys/kernel/random/uuid ]]; then cat /proc/sys/kernel/random/uuid
  else openssl rand -hex 16 | sed -E 's/(.{8})(.{4})(.{4})(.{4})(.{12})/\1-\2-\3-\4-\5/'
  fi
}
retry() {
  local attempt
  for attempt in 1 2 3 4 5 6; do
    "$@" && return 0
    warn "Attempt $attempt failed (Entra/RBAC replication can take a minute); retrying in 20s..."
    sleep 20
  done
  return 1
}

SUBSCRIPTION_ID="$(az_tsv account show --query id)"
TENANT_ID="$(az_tsv account show --query tenantId)"
SUBSCRIPTION_SCOPE="/subscriptions/$SUBSCRIPTION_ID"
[[ -n "$GITHUB_APPROVERS" ]] || GITHUB_APPROVERS="$(gh api user --jq .login | tr -d '\r')"

# The OIDC subject GitHub presents depends on repository settings. Repositories using immutable
# subjects send 'repo:<owner>@<owner-id>/<repo>@<repo-id>:...'; read the actual prefix instead of guessing.
oidc_settings="$(gh api "repos/$GITHUB_REPO_SLUG/actions/oidc/customization/sub" 2>/dev/null | tr -d '\r' || echo '{}')"
[[ "$(jq -r '.use_default // true' <<< "$oidc_settings")" == true ]] \
  || die "This repository uses a custom OIDC subject template; this script only supports the default subject format."
OIDC_SUBJECT_PREFIX="$(jq -r --arg slug "$GITHUB_REPO_SLUG" '.sub_claim_prefix // ("repo:" + $slug)' <<< "$oidc_settings")"
echo "OIDC subject prefix: $OIDC_SUBJECT_PREFIX"

# Secrets are optional on re-runs: an existing 'infra' secret is kept when its variable is unset.
existing_infra_secrets="$(gh secret list --repo "$GITHUB_REPO_SLUG" --env "$INFRA_ENV" --json name --jq '.[].name' 2>/dev/null | tr -d '\r' || true)"
for name in "${INFRA_SECRETS[@]}"; do
  value="${!name:-}"
  if [[ -z "$value" ]]; then
    grep -Fxq "$name" <<< "$existing_infra_secrets" \
      || die "$name is not set and does not exist in the '$INFRA_ENV' environment yet."
  elif (( ${#value} < 32 )); then
    die "$name must be at least 32 characters."
  fi
done

# Release jobs run database migrations from GitHub-hosted runners, which cannot reach the private
# Key Vault, so each release environment holds its own DATABASE_URL secret built from PG_ADMIN_PASSWORD.
if [[ -z "${PG_ADMIN_PASSWORD:-}" ]]; then
  for env_name in dev prod; do
    gh secret list --repo "$GITHUB_REPO_SLUG" --env "$env_name" --json name --jq '.[].name' 2>/dev/null | tr -d '\r' \
      | grep -Fxq DATABASE_URL \
      || die "PG_ADMIN_PASSWORD is required to create the DATABASE_URL secret in the '$env_name' environment."
  done
fi

# ---------------------------------------------------------------------------------------------
# Entra identities
# ---------------------------------------------------------------------------------------------
# ensure_identity <display-name> <github-environment>  -> sets APP_ID and SP_OBJECT_ID
ensure_identity() {
  local display_name="$1" environment="$2" subject="$OIDC_SUBJECT_PREFIX:environment:$2"
  APP_ID="$(az_json ad app list --filter "displayName eq '$display_name'" | jq -r '.[0].appId // empty' | tr -d '\r')"
  if [[ -z "$APP_ID" ]]; then
    APP_ID="$(az_tsv ad app create --display-name "$display_name" --sign-in-audience AzureADMyOrg --query appId)"
    echo "  Created app $display_name ($APP_ID)"
  else
    echo "  Reusing app $display_name ($APP_ID)"
  fi
  az ad sp show --id "$APP_ID" --output none 2>/dev/null || retry az ad sp create --id "$APP_ID" --output none
  SP_OBJECT_ID="$(az_tsv ad sp show --id "$APP_ID" --query id)"

  # Exactly one federated credential: this repository's environment. Anything else is removed.
  local credentials has_desired=false
  credentials="$(az_json ad app federated-credential list --id "$APP_ID")"
  while IFS=$'\t' read -r cred_id cred_subject cred_issuer; do
    [[ -z "$cred_id" ]] && continue
    if [[ "$cred_subject" == "$subject" && "$cred_issuer" == "https://token.actions.githubusercontent.com" ]]; then
      has_desired=true
    else
      az ad app federated-credential delete --id "$APP_ID" --federated-credential-id "$cred_id" --output none
      echo "    Removed unexpected federated credential ($cred_subject)"
    fi
  done < <(jq -r '.[] | [.id, .subject, .issuer] | @tsv' <<< "$credentials" | tr -d '\r')
  if [[ "$has_desired" != true ]]; then
    local file="$WORK_DIR/fic-$environment.json"
    jq -n --arg name "github-$environment" --arg subject "$subject" \
      '{name: $name, issuer: "https://token.actions.githubusercontent.com", subject: $subject, audiences: ["api://AzureADTokenExchange"]}' > "$file"
    az ad app federated-credential create --id "$APP_ID" --parameters "@$(native_path "$file")" --output none
    echo "    Trusts $subject"
  fi
}

# ensure_role <principal-object-id> <role-name-or-id> <scope>
ensure_role() {
  local principal="$1" role="$2" scope="$3" count
  count="$(az_json role assignment list --role "$role" --scope "$scope" \
    | jq --arg p "$principal" --arg s "$scope" '[.[] | select(.principalId == $p and (.scope | ascii_downcase) == ($s | ascii_downcase))] | length')"
  if [[ "${count//$'\r'/}" == "0" ]]; then
    retry az role assignment create --assignee-object-id "$principal" --assignee-principal-type ServicePrincipal \
      --role "$role" --scope "$scope" --output none
    echo "    Granted '$role'"
  else
    echo "    '$role' already assigned"
  fi
}

log "Configuring Entra identities for $GITHUB_REPO_SLUG"
ensure_identity "$AZURE_BASE_NAME-gh-readonly" "$READONLY_ENV"
READONLY_APP_ID="$APP_ID"; READONLY_SP_ID="$SP_OBJECT_ID"
ensure_identity "$AZURE_BASE_NAME-gh-infra" "$INFRA_ENV"
INFRA_APP_ID="$APP_ID"; INFRA_SP_ID="$SP_OBJECT_ID"
ensure_identity "$AZURE_BASE_NAME-gh-release-dev" dev
DEV_APP_ID="$APP_ID"; DEV_SP_ID="$SP_OBJECT_ID"
ensure_identity "$AZURE_BASE_NAME-gh-release-prod" prod
PROD_APP_ID="$APP_ID"; PROD_SP_ID="$SP_OBJECT_ID"

legacy_app="$(az_json ad app list --filter "displayName eq '$AZURE_BASE_NAME-github-actions'" | jq -r '.[0].appId // empty' | tr -d '\r')"
[[ -z "$legacy_app" ]] || warn "Legacy shared app '$AZURE_BASE_NAME-github-actions' ($legacy_app) still exists. Delete it once the new identities work: az ad app delete --id $legacy_app"

# ---------------------------------------------------------------------------------------------
# Azure roles
# ---------------------------------------------------------------------------------------------
log "Creating or updating custom role '$PREVIEW_ROLE_NAME'"
role_definition_id="$(az_json role definition list --custom-role-only true --scope "$SUBSCRIPTION_SCOPE" \
  | jq -r --arg n "$PREVIEW_ROLE_NAME" '[.[] | select(.roleName == $n)][0].name // empty' | tr -d '\r')"
[[ -n "$role_definition_id" ]] || role_definition_id="$(new_uuid)"
jq -n --arg name "$PREVIEW_ROLE_NAME" --arg scope "$SUBSCRIPTION_SCOPE" '{properties: {
  roleName: $name, type: "CustomRole",
  description: "Preview (what-if/validate) CityOps deployments and trigger policy scans. No write access.",
  permissions: [{actions: [
    "Microsoft.Resources/deployments/read",
    "Microsoft.Resources/deployments/whatIf/action",
    "Microsoft.Resources/deployments/validate/action",
    "Microsoft.Resources/deployments/operationstatuses/read",
    "Microsoft.PolicyInsights/policyStates/triggerEvaluation/action"
  ], notActions: []}],
  assignableScopes: [$scope]}}' > "$WORK_DIR/preview-role.json"
az rest --method put \
  --url "https://management.azure.com$SUBSCRIPTION_SCOPE/providers/Microsoft.Authorization/roleDefinitions/$role_definition_id?api-version=2022-04-01" \
  --body "@$(native_path "$WORK_DIR/preview-role.json")" --output none
echo "  Role definition $role_definition_id"

log "Granting read-only identity roles"
ensure_role "$READONLY_SP_ID" Reader "$SUBSCRIPTION_SCOPE"
ensure_role "$READONLY_SP_ID" "$role_definition_id" "$SUBSCRIPTION_SCOPE"

log "Granting infrastructure identity roles"
ensure_role "$INFRA_SP_ID" Contributor "$SUBSCRIPTION_SCOPE"
ensure_role "$INFRA_SP_ID" "Resource Policy Contributor" "$SUBSCRIPTION_SCOPE"

# RBAC Administrator, constrained so it can only grant/remove the roles Bicep needs.
# Uses the REST API so the condition text is not mangled by shell/cmd quoting.
guid_list="$(IFS=,; printf '%s' "${DELEGATABLE_ROLE_IDS[*]}" | sed 's/,/, /g')"
condition="((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR (@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$guid_list})) AND ((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR (@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$guid_list}))"
assignment_name="$(az_json role assignment list --role "$RBAC_ADMIN_ROLE_ID" --scope "$SUBSCRIPTION_SCOPE" \
  | jq -r --arg p "$INFRA_SP_ID" '[.[] | select(.principalId == $p)][0].name // empty' | tr -d '\r')"
[[ -n "$assignment_name" ]] || assignment_name="$(new_uuid)"
jq -n --arg role "$SUBSCRIPTION_SCOPE/providers/Microsoft.Authorization/roleDefinitions/$RBAC_ADMIN_ROLE_ID" \
  --arg principal "$INFRA_SP_ID" --arg condition "$condition" '{properties: {
    roleDefinitionId: $role, principalId: $principal, principalType: "ServicePrincipal",
    condition: $condition, conditionVersion: "2.0",
    description: "CityOps infra: may only grant/remove the roles assigned by infra/modules/resources.bicep"}}' \
  > "$WORK_DIR/rbac-admin.json"
retry az rest --method put \
  --url "https://management.azure.com$SUBSCRIPTION_SCOPE/providers/Microsoft.Authorization/roleAssignments/$assignment_name?api-version=2022-04-01" \
  --body "@$(native_path "$WORK_DIR/rbac-admin.json")" --output none
echo "    Granted constrained 'Role Based Access Control Administrator'"
echo "  Release identities get their slot/site roles from Bicep on the first infrastructure apply."

# ---------------------------------------------------------------------------------------------
# GitHub environments
# ---------------------------------------------------------------------------------------------
reviewers_json="[]"
IFS=',' read -r -a approvers <<< "$GITHUB_APPROVERS"
for approver in "${approvers[@]}"; do
  approver="$(xargs <<< "$approver")"
  [[ -z "$approver" ]] && continue
  if [[ "$approver" == */* ]]; then
    reviewer_id="$(gh api "orgs/${approver%%/*}/teams/${approver#*/}" --jq .id | tr -d '\r')" || die "Team '$approver' not found."
    reviewers_json="$(jq -c --argjson id "$reviewer_id" '. + [{type: "Team", id: $id}]' <<< "$reviewers_json")"
  else
    reviewer_id="$(gh api "users/$approver" --jq .id | tr -d '\r')" || die "User '$approver' not found."
    reviewers_json="$(jq -c --argjson id "$reviewer_id" '. + [{type: "User", id: $id}]' <<< "$reviewers_json")"
  fi
done
[[ "$reviewers_json" != "[]" ]] || die "GITHUB_APPROVERS resolved to no reviewers."
prevent_self_review=true
if is_true "$ALLOW_SELF_APPROVAL"; then
  prevent_self_review=false
  warn "ALLOW_SELF_APPROVAL=true: approvers can approve their own runs. Demo only; disable for real environments."
fi

# ensure_environment <name> <requires-approval:true|false>
ensure_environment() {
  local name="$1" gated="$2" body
  if [[ "$gated" == true ]]; then
    body="$(jq -n --argjson reviewers "$reviewers_json" --argjson prevent "$prevent_self_review" \
      '{wait_timer: 0, reviewers: $reviewers, prevent_self_review: $prevent, can_admins_bypass: false,
        deployment_branch_policy: {protected_branches: false, custom_branch_policies: true}}')"
  else
    body='{"wait_timer":0,"reviewers":[],"can_admins_bypass":false,"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}'
  fi
  gh api --method PUT "repos/$GITHUB_REPO_SLUG/environments/$name" --input - --silent <<< "$body" \
    || die "Could not configure environment '$name'."

  # Deployment branch policy: exactly 'main' (branch), nothing else.
  local has_main=false
  while IFS=$'\t' read -r policy_id policy_type policy_name; do
    [[ -z "$policy_id" ]] && continue
    if [[ "$policy_type" == branch && "$policy_name" == main ]]; then
      has_main=true
    else
      gh api --method DELETE "repos/$GITHUB_REPO_SLUG/environments/$name/deployment-branch-policies/$policy_id" --silent
      echo "    Removed deployment policy $policy_type:$policy_name"
    fi
  done < <(gh api "repos/$GITHUB_REPO_SLUG/environments/$name/deployment-branch-policies" \
    --jq '.branch_policies[] | [.id, (.type // "branch"), .name] | @tsv' | tr -d '\r')
  [[ "$has_main" == true ]] || gh api --method POST "repos/$GITHUB_REPO_SLUG/environments/$name/deployment-branch-policies" \
    -f name=main -f type=branch --silent
  echo "  $name: main only$([[ "$gated" == true ]] && echo ", reviewers $GITHUB_APPROVERS, self-review prevented=$prevent_self_review")"
}

log "Configuring GitHub environments"
ensure_environment "$READONLY_ENV" false
ensure_environment "$INFRA_ENV" true
ensure_environment dev false
ensure_environment prod true

log "Setting per-environment AZURE_CLIENT_ID"
set_env_variable() { gh variable set AZURE_CLIENT_ID --repo "$GITHUB_REPO_SLUG" --env "$1" --body "$2" >/dev/null && echo "  $1: $2"; }
set_env_variable "$READONLY_ENV" "$READONLY_APP_ID"
set_env_variable "$INFRA_ENV" "$INFRA_APP_ID"
set_env_variable dev "$DEV_APP_ID"
set_env_variable prod "$PROD_APP_ID"

log "Setting '$INFRA_ENV' environment secrets"
for name in "${INFRA_SECRETS[@]}"; do
  if [[ -n "${!name:-}" ]]; then
    # Piped via stdin so the value never appears in the process list.
    printf '%s' "${!name}" | gh secret set "$name" --repo "$GITHUB_REPO_SLUG" --env "$INFRA_ENV" >/dev/null
    echo "  $name set"
  else
    echo "  $name kept (already set)"
  fi
done

log "Setting release environment DATABASE_URL secrets"
if [[ -n "${PG_ADMIN_PASSWORD:-}" ]]; then
  pg_host="pg-$AZURE_BASE_NAME.postgres.database.azure.com"
  pg_password_uri="$(jq -rn --arg value "$PG_ADMIN_PASSWORD" '$value | @uri')"
  for target in "dev cityops_dev" "prod cityops"; do
    read -r env_name db_name <<< "$target"
    printf '%s' "postgresql://$PG_ADMIN_LOGIN:$pg_password_uri@$pg_host:5432/$db_name?sslmode=require" \
      | gh secret set DATABASE_URL --repo "$GITHUB_REPO_SLUG" --env "$env_name" >/dev/null
    echo "  $env_name: DATABASE_URL set ($db_name)"
  done
else
  echo "  DATABASE_URL kept in dev and prod (already set)"
fi

log "Setting repository variables"
set_variable() { gh variable set "$1" --repo "$GITHUB_REPO_SLUG" --body "$2" >/dev/null && echo "  $1=$2"; }
set_variable AZURE_TENANT_ID "$TENANT_ID"
set_variable AZURE_SUBSCRIPTION_ID "$SUBSCRIPTION_ID"
set_variable AZURE_RESOURCE_GROUP "$AZURE_RESOURCE_GROUP"
set_variable AZURE_LOCATION "$AZURE_LOCATION"
set_variable AZURE_DB_LOCATION "$AZURE_DB_LOCATION"
set_variable AZURE_BASE_NAME "$AZURE_BASE_NAME"
set_variable AZURE_OPENAI_ACCOUNT_NAME "$AZURE_OPENAI_ACCOUNT_NAME"
set_variable ALERT_EMAIL_ADDRESS "$ALERT_EMAIL_ADDRESS"
set_variable AZURE_RELEASE_DEV_PRINCIPAL_ID "$DEV_SP_ID"
set_variable AZURE_RELEASE_PROD_PRINCIPAL_ID "$PROD_SP_ID"
set_variable ALLOW_SELF_APPROVAL "$(is_true "$ALLOW_SELF_APPROVAL" && echo true || echo false)"

# Identity values now live per environment; a repository-level AZURE_CLIENT_ID would be picked
# up by any job that forgot its environment, so legacy repository values are removed.
log "Removing legacy repository-level secrets/variables"
repo_secrets="$(gh secret list --repo "$GITHUB_REPO_SLUG" --json name --jq '.[].name' | tr -d '\r')"
for name in "${LEGACY_REPO_SECRETS[@]}"; do
  if grep -Fxq "$name" <<< "$repo_secrets"; then
    gh secret delete "$name" --repo "$GITHUB_REPO_SLUG" >/dev/null && echo "  Deleted secret $name"
  fi
done
if gh variable list --repo "$GITHUB_REPO_SLUG" --json name --jq '.[].name' | tr -d '\r' | grep -Fxq AZURE_CLIENT_ID; then
  gh variable delete AZURE_CLIENT_ID --repo "$GITHUB_REPO_SLUG" >/dev/null && echo "  Deleted variable AZURE_CLIENT_ID"
fi

# A workflow disabled in the UI stays disabled even once its configuration exists.
if is_true "$ENABLE_GITHUB_WORKFLOWS"; then
  log "Enabling CityOps workflows"
  for workflow in app-cicd.yml infra-cicd.yml; do
    gh workflow enable "$workflow" --repo "$GITHUB_REPO_SLUG" >/dev/null \
      || die "Could not enable $workflow. Merge the workflow definitions before running setup."
    echo "  Enabled $workflow"
  done
fi

log "GitHub Actions bootstrap complete"
echo "  Next: run 'CityOps Infra CI/CD' with operation=apply (docs/deployment/github-actions-setup.md)."
warn "If Azure DevOps is also configured, disable its deployment triggers; the providers share no lock."
