#!/usr/bin/env bash
set -euo pipefail

environment_name="${1:?Usage: check-environment.sh <environment>}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
# Demo-only exception for a single-person organization; documented in docs/deployment/github-actions-setup.md.
allow_self_approval="${ALLOW_SELF_APPROVAL:-false}"

configuration="$(gh api "repos/$GITHUB_REPOSITORY/environments/$environment_name")"
if ! jq -e --argjson allow_self "$([[ "$allow_self_approval" == "true" ]] && echo true || echo false)" '
  .can_admins_bypass == false and
  .deployment_branch_policy.custom_branch_policies == true and
  any(.protection_rules[]?;
    .type == "required_reviewers" and
    (.prevent_self_review == true or $allow_self) and
    (.reviewers | length) > 0)
' <<< "$configuration" >/dev/null; then
  echo "::error::$environment_name must require independent reviewers, disallow admin bypass, and use selected deployment branches."
  exit 1
fi
if [[ "$allow_self_approval" == "true" ]] && ! jq -e 'any(.protection_rules[]?; .prevent_self_review == true)' <<< "$configuration" >/dev/null; then
  echo "::warning::$environment_name allows self-approval (ALLOW_SELF_APPROVAL=true). Acceptable for a single-person demo only."
fi

branches="$(gh api --paginate --slurp "repos/$GITHUB_REPOSITORY/environments/$environment_name/deployment-branch-policies?per_page=100")"
if ! jq -e '
  [.[].branch_policies[]] as $policies |
  ($policies | length) == 1 and
  $policies[0].name == "main" and $policies[0].type == "branch"
' <<< "$branches" >/dev/null; then
  echo "::error::$environment_name must allow only the main branch, with no tag deployment rules."
  exit 1
fi
echo "Verified independent approval and main-only deployment policy for $environment_name."
