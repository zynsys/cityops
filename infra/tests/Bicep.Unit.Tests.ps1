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

    It 'makes release identity <_> optional so local deployments skip its role assignments' -ForEach 'devReleasePrincipalId', 'prodReleasePrincipalId' {
        $mainTemplate.parameters.$_.defaultValue | Should -Be ''
        $resourcesTemplate.parameters.$_.defaultValue | Should -Be ''
    }

    It 'grants <Name> only <Role> at its narrow scope' -ForEach @(
        @{ Name = 'devReleaseReader'; Role = 'readerRoleId'; Id = 'acdd72a7-3385-48ef-bd42-f606fba81ae7'; Scope = $null }
        @{ Name = 'devReleaseSlotContributor'; Role = 'websiteContributorRoleId'; Id = 'de139f84-1756-47ae-9be6-808fbbbdf0ee'; Scope = 'slots' }
        @{ Name = 'devReleaseDatabaseSecret'; Role = 'kvSecretsUserRoleId'; Id = '4633458b-17de-408a-b874-0445c86b69e6'; Scope = 'DATABASE-URL-DEV' }
        @{ Name = 'prodReleaseReader'; Role = 'readerRoleId'; Id = 'acdd72a7-3385-48ef-bd42-f606fba81ae7'; Scope = $null }
        @{ Name = 'prodReleaseSiteContributor'; Role = 'websiteContributorRoleId'; Id = 'de139f84-1756-47ae-9be6-808fbbbdf0ee'; Scope = 'Microsoft.Web/sites' }
        @{ Name = 'prodReleaseDatabaseSecret'; Role = 'kvSecretsUserRoleId'; Id = '4633458b-17de-408a-b874-0445c86b69e6'; Scope = "'DATABASE-URL')" }
    ) {
        $assignment = $resourcesTemplate.resources.$Name
        $assignment.condition | Should -Match 'empty\(parameters\(''(dev|prod)ReleasePrincipalId''\)\)'
        $assignment.properties.roleDefinitionId | Should -Match ([regex]::Escape("variables('$Role')"))
        $resourcesTemplate.variables.$Role | Should -Be $Id
        if ($Scope) {
            $assignment.scope | Should -Match ([regex]::Escape($Scope))
        } else {
            $assignment.PSObject.Properties.Name | Should -Not -Contain 'scope'
        }
    }

    It 'never grants the dev release identity the production database secret or site' {
        $resourcesTemplate.resources.devReleaseDatabaseSecret.scope | Should -Not -Match "'DATABASE-URL'\)"
        $resourcesTemplate.resources.devReleaseSlotContributor.scope | Should -Match 'slots'
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
