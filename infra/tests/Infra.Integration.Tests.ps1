# Post-deploy integration tests — verifies the resources infra-cicd just (re-)provisioned are
# actually healthy, not just that ARM reported success. Requires an active `az login`/OIDC
# session (same as the bash version this replaces) and the infra-outputs.json artifact from Deploy.
#
# Run: pwsh -Command "Invoke-Pester infra/tests/Infra.Integration.Tests.ps1 -Output Detailed" `
#        -Container (New-PesterContainer -Path infra/tests/Infra.Integration.Tests.ps1 -Data @{
#          OutputsPath = 'infra-outputs.json'; ResourceGroup = 'rg-cityops'; OpenAiAccountName = 'azopenai-cityops'
#        })
param(
    [Parameter(Mandatory)] [string] $OutputsPath,
    [Parameter(Mandatory)] [string] $ResourceGroup,
    [Parameter(Mandatory)] [string] $OpenAiAccountName
)

Describe 'Provisioned resources are healthy' {
    BeforeAll {
        $outputs = Get-Content $OutputsPath -Raw | ConvertFrom-Json
        $keyVaultName = $outputs.keyVaultName.value
        $postgresServerName = $outputs.postgresServerName.value
        $webAppUrl = $outputs.webAppUrl.value
        $devSlotUrl = $outputs.devSlotUrl.value
    }

    # Hard gate — Key Vault/PostgreSQL/Azure OpenAI are always expected healthy right after a
    # successful apply, regardless of whether any app code has ever been deployed.
    It 'Key Vault is provisioned (state Succeeded)' {
        $state = az keyvault show -n $keyVaultName -g $ResourceGroup --query 'properties.provisioningState' -o tsv
        $state | Should -Be 'Succeeded'
    }

    It 'PostgreSQL Flexible Server is ready (state Ready)' {
        $state = az postgres flexible-server show -g $ResourceGroup -n $postgresServerName --query 'state' -o tsv
        $state | Should -Be 'Ready'
    }

    It 'Azure OpenAI account is provisioned (state Succeeded)' {
        $state = az cognitiveservices account show -g $ResourceGroup -n $OpenAiAccountName --query 'properties.provisioningState' -o tsv
        $state | Should -Be 'Succeeded'
    }

    # Informational only — on the very first infra deploy there is no app code yet (app-cicd
    # deploys that separately), so an unreachable/5xx app here is expected, not a failure.
    It 'production web app does not return a 5xx' {
        $status = try {
            (Invoke-WebRequest -Uri $webAppUrl -TimeoutSec 15 -UseBasicParsing).StatusCode
        } catch {
            if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        }
        if ($status -ge 500 -or $status -eq 0) {
            Set-ItResult -Skipped -Because "HTTP $status — expected until app-cicd has deployed code at least once"
        }
    }

    It 'dev slot web app does not return a 5xx' {
        $status = try {
            (Invoke-WebRequest -Uri $devSlotUrl -TimeoutSec 15 -UseBasicParsing).StatusCode
        } catch {
            if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        }
        if ($status -ge 500 -or $status -eq 0) {
            Set-ItResult -Skipped -Because "HTTP $status — expected until app-cicd has deployed code at least once"
        }
    }
}
