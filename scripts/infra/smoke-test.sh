#!/usr/bin/env bash
# Run the existing infrastructure integration tests against a deployment output file.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

OUTPUT_FILE="${1:-${INFRA_OUTPUT_FILE:-$REPO_ROOT/infra-outputs.json}}"
AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-cityops}"
AZURE_BASE_NAME="${AZURE_BASE_NAME:-cityops}"
AZURE_OPENAI_ACCOUNT_NAME="${AZURE_OPENAI_ACCOUNT_NAME:-azopenai-$AZURE_BASE_NAME}"

require_command az
require_command pwsh
[[ -f "$OUTPUT_FILE" ]] || die "Infrastructure output file '$OUTPUT_FILE' does not exist."
az account show >/dev/null 2>&1 || die "Not logged in to Azure. Run 'az login' first."

log "Running infrastructure smoke tests"
pwsh -NoProfile -Command "
  Import-Module Pester -MinimumVersion 5.6.1
  \$container = New-PesterContainer -Path '$REPO_ROOT/infra/tests/Infra.Integration.Tests.ps1' -Data @{
    OutputsPath = '$OUTPUT_FILE'
    ResourceGroup = '$AZURE_RESOURCE_GROUP'
    OpenAiAccountName = '$AZURE_OPENAI_ACCOUNT_NAME'
  }
  \$config = New-PesterConfiguration
  \$config.Run.Container = \$container
  \$config.Run.Exit = \$true
  \$config.Output.Verbosity = 'Detailed'
  Invoke-Pester -Configuration \$config
"
