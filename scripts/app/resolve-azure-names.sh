#!/usr/bin/env bash
# Print deterministic CityOps Azure resource names as shell assignments.

set -euo pipefail

base_name="${1:-${AZURE_BASE_NAME:-cityops}}"
printf 'WEB_APP_NAME=%q\n' "app-$base_name"
printf 'KEY_VAULT_NAME=%q\n' "kv-$base_name"
