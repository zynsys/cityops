# Unit tests for the CityOps Bicep templates. Compiles each template via `az bicep build` and
# asserts on the resulting ARM JSON — no Azure login, subscription, or deployment required.
# Run locally: pwsh -Command "Invoke-Pester infra/tests/Bicep.Unit.Tests.ps1 -Output Detailed"

BeforeAll {
    $repoRoot = Resolve-Path "$PSScriptRoot/../.."

    function ConvertTo-ArmTemplate([string]$RelativePath) {
        $path = Join-Path $repoRoot $RelativePath
        $json = az bicep build --file $path --stdout
        if ($LASTEXITCODE -ne 0) {
            throw "az bicep build failed for $RelativePath"
        }
        return $json | ConvertFrom-Json -Depth 100
    }

    $mainTemplate = ConvertTo-ArmTemplate 'infra/main.bicep'
    $resourcesTemplate = ConvertTo-ArmTemplate 'infra/modules/resources.bicep'
    $alertsTemplate = ConvertTo-ArmTemplate 'infra/modules/alerts.bicep'
}

Describe 'infra/main.bicep' {
    It 'compiles to a subscription-scoped ARM template' {
        $mainTemplate.'$schema' | Should -Match 'subscriptionDeploymentTemplate'
    }

    It 'requires <_> as a securestring with no checked-in default' -ForEach 'pgAdminPassword', 'authSecret', 'authSecretDev' {
        $param = $mainTemplate.parameters.$_
        $param.type | Should -Be 'securestring'
        ($param.PSObject.Properties.Name -contains 'defaultValue') | Should -BeFalse -Because "$_ must never ship a default"
    }

    It 'defaults alertEmailAddress to an empty string (opt-in alerting)' {
        $mainTemplate.parameters.alertEmailAddress.defaultValue | Should -Be ''
    }

    It 'defaults <_> to francecentral' -ForEach 'location', 'dbLocation', 'openAiLocation' {
        $mainTemplate.parameters.$_.defaultValue | Should -Be 'francecentral'
    }

    It 'exposes <_> as an output' -ForEach 'webAppName', 'webAppUrl', 'devSlotUrl', 'keyVaultName', 'postgresServerName', 'resourceGroupName', 'actionGroupName' {
        $mainTemplate.outputs.PSObject.Properties.Name | Should -Contain $_
    }
}

Describe 'infra/modules/resources.bicep' {
    It 'gates the alerts module on a non-empty alertEmailAddress' {
        $resourcesTemplate.resources.alerts.condition | Should -Be "[not(empty(parameters('alertEmailAddress')))]"
    }

    It 'falls back actionGroupName to an empty string when the alerts module is skipped' {
        $resourcesTemplate.outputs.actionGroupName.value | Should -Match '^\[coalesce\('
    }
}

Describe 'infra/modules/alerts.bicep' {
    It 'creates exactly one action group and two metric alerts' {
        $types = $alertsTemplate.resources | ForEach-Object { $_.type }
        ($types | Where-Object { $_ -eq 'Microsoft.Insights/actionGroups' }).Count | Should -Be 1
        ($types | Where-Object { $_ -eq 'Microsoft.Insights/metricAlerts' }).Count | Should -Be 2
    }

    It 'has no default for alertEmailAddress (caller must always supply it)' {
        $param = $alertsTemplate.parameters.alertEmailAddress
        ($param.PSObject.Properties.Name -contains 'defaultValue') | Should -BeFalse
    }

    It 'defaults both alert thresholds to 0 (alert on the first occurrence)' {
        $alertsTemplate.parameters.exceptionThreshold.defaultValue | Should -Be 0
        $alertsTemplate.parameters.failedRequestThreshold.defaultValue | Should -Be 0
    }
}
