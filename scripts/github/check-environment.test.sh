#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="example/cityops"
export CONFIGURATION='{
  "can_admins_bypass": false,
  "deployment_branch_policy": {"custom_branch_policies": true},
  "protection_rules": [{
    "type": "required_reviewers",
    "prevent_self_review": true,
    "reviewers": [{"type": "User", "reviewer": {"id": 1}}]
  }]
}'
export BRANCHES='[{"branch_policies":[{"name":"main","type":"branch"}]}]'
export API_ERROR=false
unset ALLOW_SELF_APPROVAL

gh() {
  if [[ "$API_ERROR" == "true" ]]; then
    echo "API request failed" >&2
    return 1
  fi
  if [[ "$*" == *deployment-branch-policies* ]]; then
    printf '%s\n' "$BRANCHES"
  else
    printf '%s\n' "$CONFIGURATION"
  fi
}
export -f gh

run_case() {
  local label="$1" expected="$2" status=0 output
  output="$(bash "$script_dir/check-environment.sh" prod 2>&1)" || status=$?
  if [[ "$expected" == "pass" && "$status" -eq 0 ]]; then
    echo "PASS: $label"
  elif [[ "$expected" == "fail" && "$status" -ne 0 && -n "$output" ]]; then
    echo "PASS: $label rejected explicitly"
  else
    echo "FAIL: $label (exit $status): $output" >&2
    exit 1
  fi
}

valid_configuration="$CONFIGURATION"
valid_branches="$BRANCHES"
run_case "independent approval and main-only deployments" pass
CONFIGURATION="$(jq '.can_admins_bypass = true' <<< "$valid_configuration")"
run_case "administrator bypass" fail
CONFIGURATION="$(jq '.protection_rules[0].prevent_self_review = false' <<< "$valid_configuration")"
run_case "self approval" fail
ALLOW_SELF_APPROVAL=true run_case "self approval with explicit demo exception" pass
ALLOW_SELF_APPROVAL=yes run_case "self approval with a non-boolean exception value" fail
CONFIGURATION="$(jq '.protection_rules[0].prevent_self_review = false | .can_admins_bypass = true' <<< "$valid_configuration")"
ALLOW_SELF_APPROVAL=true run_case "demo exception still rejects administrator bypass" fail
CONFIGURATION="$(jq '.protection_rules[0].prevent_self_review = false | .protection_rules[0].reviewers = []' <<< "$valid_configuration")"
ALLOW_SELF_APPROVAL=true run_case "demo exception still requires a reviewer" fail
CONFIGURATION="$(jq '.protection_rules[0].reviewers = []' <<< "$valid_configuration")"
run_case "empty reviewers" fail
CONFIGURATION="$(jq '.protection_rules = []' <<< "$valid_configuration")"
run_case "missing approval rule" fail
CONFIGURATION="$(jq '.deployment_branch_policy = null' <<< "$valid_configuration")"
run_case "unrestricted deployments" fail
CONFIGURATION="$valid_configuration"
BRANCHES='[{"branch_policies":[]}]'
run_case "missing main branch rule" fail
BRANCHES='[{"branch_policies":[{"name":"main","type":"tag"}]}]'
run_case "main tag instead of branch" fail
BRANCHES='[{"branch_policies":[{"name":"main","type":"branch"}]},{"branch_policies":[{"name":"feature/*","type":"branch"}]}]'
run_case "additional branch on another API page" fail
BRANCHES="$valid_branches"
API_ERROR=true
run_case "missing environment or unavailable API" fail
echo "All 14 approval protection tests passed."
