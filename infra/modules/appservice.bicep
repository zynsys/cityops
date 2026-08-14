@description('Azure region.')
param location string

@description('App Service plan name.')
param planName string

@description('Web app name.')
param appName string

@description('App Service plan SKU name (S1+ required for deployment slots).')
param skuName string

@description('App Service plan SKU tier matching skuName.')
param skuTier string

@description('alwaysOn (supported on Standard+).')
param alwaysOn bool

@description('App settings shared by both the production site and the dev slot.')
param commonAppSettings array

@description('App settings applied only to the production slot (e.g. DATABASE_URL, NEXTAUTH_URL).')
param prodAppSettings array

@description('App settings applied only to the dev slot (e.g. DATABASE_URL-DEV, NEXTAUTH_URL).')
param devAppSettings array

@description('Names of app settings that must stay slot-sticky (do not travel on swap).')
param stickyAppSettingNames array

@description('Name of the pre-production deployment slot.')
param devSlotName string = 'dev'

@description('Tags applied to these resources.')
param tags object = {}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  tags: tags
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      alwaysOn: alwaysOn
      ftpsState: 'Disabled'
      appCommandLine: 'node server.js'
      appSettings: concat(commonAppSettings, prodAppSettings)
    }
  }
}

// Pre-production slot: same code, same App Service plan (no extra compute cost beyond the
// plan's own capacity), isolated by its own app settings (own DB, own managed identity).
resource devSlot 'Microsoft.Web/sites/slots@2023-12-01' = {
  parent: webApp
  name: devSlotName
  location: location
  tags: tags
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      alwaysOn: alwaysOn
      ftpsState: 'Disabled'
      appCommandLine: 'node server.js'
      appSettings: concat(commonAppSettings, devAppSettings)
    }
  }
}

// Env-specific settings are slot-sticky, so they do NOT travel during a swap.
resource slotStickySettings 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: webApp
  name: 'slotConfigNames'
  properties: {
    appSettingNames: stickyAppSettingNames
  }
  dependsOn: [
    devSlot
  ]
}

output webAppId string = webApp.id
output webAppPrincipalId string = webApp.identity.principalId
output devSlotPrincipalId string = devSlot.identity.principalId
output devSlotHost string = devSlot.properties.defaultHostName
