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
        @{ Name = 'devReleaseSlotContributor'; Role = 'websiteContributorRoleId'; Id = 'de139f84-1756-47ae-9be6-808fbbe84772'; Scope = 'slots' }
        @{ Name = 'prodReleaseReader'; Role = 'readerRoleId'; Id = 'acdd72a7-3385-48ef-bd42-f606fba81ae7'; Scope = $null }
        @{ Name = 'prodReleaseSiteContributor'; Role = 'websiteContributorRoleId'; Id = 'de139f84-1756-47ae-9be6-808fbbe84772'; Scope = 'Microsoft.Web/sites' }
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

    It 'never grants the dev release identity the production site' {
        $resourcesTemplate.resources.devReleaseSlotContributor.scope | Should -Match 'slots'
    }

    It 'does not give release identities Key Vault secret access (runners cannot reach the private vault)' {
        $resourcesTemplate.resources.PSObject.Properties.Name | Should -Not -Contain 'devReleaseDatabaseSecret'
        $resourcesTemplate.resources.PSObject.Properties.Name | Should -Not -Contain 'prodReleaseDatabaseSecret'
    }

    It 'grants each slot Storage Blob Data Contributor on its own container only' -ForEach @(
        @{ Name = 'blobRoleAssignment'; Container = "variables('storageContainer'))"; Principal = 'webAppPrincipalId' }
        @{ Name = 'blobRoleAssignmentDevSlot'; Container = "variables('storageContainerDev'))"; Principal = 'devSlotPrincipalId' }
    ) {
        $assignment = $resourcesTemplate.resources.$Name
        $resourcesTemplate.variables.storageBlobDataContributorRoleId | Should -Be 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
        $assignment.properties.roleDefinitionId | Should -Match 'storageBlobDataContributorRoleId'
        $assignment.properties.principalId | Should -Match $Principal
        $assignment.scope | Should -Match ([regex]::Escape($Container))
    }

    It 'uses managed identity for blob storage instead of a connection string' {
        $appServiceJson = $resourcesTemplate.resources.appService | ConvertTo-Json -Depth 100 -Compress
        $appServiceJson | Should -Match 'AZURE_STORAGE_ACCOUNT_URL'
        $appServiceJson | Should -Not -Match 'AZURE_STORAGE_CONNECTION_STRING'
        $resourcesTemplate.resources.PSObject.Properties.Name | Should -Not -Contain 'secretStorageConnectionString'
    }

    It 'puts <_> behind a private endpoint before the web app is created' -ForEach 'storagePrivateEndpoint', 'keyVaultPrivateEndpoint' {
        $resourcesTemplate.resources.$_ | Should -Not -BeNullOrEmpty
        ($resourcesTemplate.resources.appService.dependsOn -join ' ') | Should -Match $_
    }

    It 'integrates the web app with the VNet app subnet' {
        $resourcesTemplate.resources.appService.properties.parameters.virtualNetworkSubnetId.value | Should -Match 'appSubnetId'
    }
}

Describe 'private networking modules' {
    BeforeAll {
        $storageTemplate = ConvertTo-ArmTemplate 'infra/modules/storage.bicep'
        $keyVaultTemplate = ConvertTo-ArmTemplate 'infra/modules/keyvault.bicep'
        $appServiceTemplate = ConvertTo-ArmTemplate 'infra/modules/appservice.bicep'
        $networkTemplate = ConvertTo-ArmTemplate 'infra/modules/network.bicep'

        function Get-Resource($Template, [string]$Type) {
            @($Template.resources | Where-Object { $_.type -eq $Type })
        }
    }

    It 'locks the storage account down (no public access, no shared keys)' {
        $account = (Get-Resource $storageTemplate 'Microsoft.Storage/storageAccounts')[0].properties
        $account.allowBlobPublicAccess | Should -BeFalse
        $account.allowSharedKeyAccess | Should -BeFalse
        $account.publicNetworkAccess | Should -Be 'Disabled'
        $containers = Get-Resource $storageTemplate 'Microsoft.Storage/storageAccounts/blobServices/containers'
        $containers.Count | Should -Be 2
        $containers | ForEach-Object { $_.properties.publicAccess | Should -Be 'None' }
    }

    It 'disables public network access on Key Vault' {
        (Get-Resource $keyVaultTemplate 'Microsoft.KeyVault/vaults')[0].properties.publicNetworkAccess | Should -Be 'Disabled'
    }

    It 'routes all <_> traffic through the VNet' -ForEach 'Microsoft.Web/sites', 'Microsoft.Web/sites/slots' {
        $site = (Get-Resource $appServiceTemplate $_)[0].properties
        $site.virtualNetworkSubnetId | Should -Be "[parameters('virtualNetworkSubnetId')]"
        $site.siteConfig.vnetRouteAllEnabled | Should -BeTrue
    }

    It 'delegates the app subnet to App Service and keeps internet egress for PostgreSQL and OpenAI' {
        $appSubnet = (Get-Resource $networkTemplate 'Microsoft.Network/virtualNetworks')[0].properties.subnets | Where-Object name -eq 'snet-app'
        $appSubnet.properties.delegations[0].properties.serviceName | Should -Be 'Microsoft.Web/serverFarms'
        $appSubnet.properties.defaultOutboundAccess | Should -BeTrue
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
