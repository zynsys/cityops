// CityOps — App Service (code deploy) + PostgreSQL Flexible Server (PostGIS) + Key Vault
// No containers: the Web App runs the Next.js standalone server via `node server.js`.
targetScope = 'resourceGroup'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Region for PostgreSQL (kept separate: not all regions offer the Flexible Server SKU).')
param dbLocation string = 'uksouth'

@description('Base name used to derive resource names.')
param baseName string = 'cityops'

@description('PostgreSQL administrator login.')
param pgAdminLogin string = 'cityopsadmin'

@description('PostgreSQL administrator password.')
@secure()
param pgAdminPassword string

@description('Auth.js (NextAuth) secret — at least 32 chars.')
@secure()
param authSecret string

@description('App Service plan SKU name (S1+ required for deployment slots).')
param appServiceSkuName string = 'S1'

@description('App Service plan SKU tier matching the SKU name.')
param appServiceSkuTier string = 'Standard'

@description('alwaysOn (supported on Standard+).')
param alwaysOn bool = true

@description('Name of the non-production (dev) deployment slot.')
param devSlotName string = 'dev'

var suffix = uniqueString(resourceGroup().id)
var planName = 'asp-${baseName}'
var appName = 'app-${baseName}-${suffix}'
var kvName = 'kv-${baseName}-${substring(suffix, 0, 8)}'
var pgName = 'pg-${baseName}-${suffix}'
var dbName = 'cityops'
var appHost = '${appName}.azurewebsites.net'
var devSlotHost = '${appName}-${devSlotName}.azurewebsites.net'
var dbNameDev = '${dbName}_dev'

// ---------------------------------------------------------------------------
// PostgreSQL Flexible Server (Burstable) with PostGIS allow-listed
// ---------------------------------------------------------------------------
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: pgName
  location: dbLocation
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: pgAdminLogin
    administratorLoginPassword: pgAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource pgDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: dbName
}

resource pgDatabaseDev 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: dbNameDev
}

// Allow-list the PostGIS extension so migrations can CREATE EXTENSION postgis.
resource pgExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-06-01-preview' = {
  parent: postgres
  name: 'azure.extensions'
  properties: {
    value: 'POSTGIS'
    source: 'user-override'
  }
}

// Allow other Azure services (incl. App Service) to reach the server.
resource pgAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

var databaseUrlProd = 'postgresql://${pgAdminLogin}:${pgAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/${dbName}?sslmode=require'
var databaseUrlDev = 'postgresql://${pgAdminLogin}:${pgAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/${dbNameDev}?sslmode=require'

// ---------------------------------------------------------------------------
// Key Vault (RBAC) + secrets
// ---------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
  }
}

resource secretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'DATABASE-URL'
  properties: {
    value: databaseUrlProd
  }
}

resource secretDatabaseUrlDev 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'DATABASE-URL-DEV'
  properties: {
    value: databaseUrlDev
  }
}

resource secretAuthSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'AUTH-SECRET'
  properties: {
    value: authSecret
  }
}

// ---------------------------------------------------------------------------
// App Service Plan (Linux) + Web App (Node 20, code deploy)
// ---------------------------------------------------------------------------
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: appServiceSkuName
    tier: appServiceSkuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: alwaysOn
      ftpsState: 'Disabled'
      appCommandLine: 'node server.js'
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'NEXTAUTH_URL'
          value: 'https://${appHost}'
        }
        {
          name: 'STORAGE_PROVIDER'
          value: 'local'
        }
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(SecretUri=${secretDatabaseUrl.properties.secretUri})'
        }
        {
          name: 'AUTH_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${secretAuthSecret.properties.secretUri})'
        }
      ]
    }
  }
}

// Grant the Web App's managed identity read access to Key Vault secrets (RBAC).
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: webApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

// Env-specific settings are slot-sticky, so they do NOT travel during a swap.
resource slotStickySettings 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: webApp
  name: 'slotConfigNames'
  properties: {
    appSettingNames: [
      'DATABASE_URL'
      'NEXTAUTH_URL'
    ]
  }
}

// Non-production (dev) slot — its own identity + config pointing at the dev database.
resource devSlot 'Microsoft.Web/sites/slots@2023-12-01' = {
  parent: webApp
  name: devSlotName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: alwaysOn
      ftpsState: 'Disabled'
      appCommandLine: 'node server.js'
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'NEXTAUTH_URL'
          value: 'https://${devSlotHost}'
        }
        {
          name: 'STORAGE_PROVIDER'
          value: 'local'
        }
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(SecretUri=${secretDatabaseUrlDev.properties.secretUri})'
        }
        {
          name: 'AUTH_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${secretAuthSecret.properties.secretUri})'
        }
      ]
    }
  }
}

// Grant the dev slot's managed identity read access to Key Vault secrets.
resource kvRoleAssignmentDevSlot 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, devSlot.id, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: devSlot.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

output webAppName string = webApp.name
output webAppUrl string = 'https://${appHost}'
output devSlotName string = devSlotName
output devSlotUrl string = 'https://${devSlotHost}'
output keyVaultName string = keyVault.name
output postgresFqdn string = postgres.properties.fullyQualifiedDomainName
