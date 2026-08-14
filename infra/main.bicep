// CityOps — App Service (code deploy) + PostgreSQL Flexible Server (PostGIS) + Key Vault
// No containers: the Web App runs the Next.js standalone server via `node server.js`.
//
// Modularized: modules/keyvault.bicep, modules/postgres.bicep, modules/appservice.bicep each
// own one logical concern (security, data, compute). The Azure OpenAI account is referenced
// as an EXISTING resource (provisioned separately) — not created here.
targetScope = 'resourceGroup'

@description('Azure region for App Service and Key Vault.')
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

@description('Azure OpenAI (Cognitive Services) account name. Matching an existing resource of this name in this resource group adopts it instead of creating a duplicate.')
param openAiAccountName string = 'azopenai-cityops'

@description('Azure region for Azure OpenAI — model/region availability varies independently of App Service/Postgres regions.')
param openAiLocation string = 'eastus'

@description('Name of the deployed model used for AI report validation.')
param openAiDeploymentName string = 'gpt-4o'

@description('Model name to deploy.')
param openAiModelName string = 'gpt-4o'

@description('Model version to deploy.')
param openAiModelVersion string = '2024-11-20'

@description('Deployment SKU name (throughput tier).')
param openAiSkuName string = 'GlobalStandard'

@description('Deployment capacity (TPM units) — subject to per-subscription/region quota.')
param openAiCapacity int = 100

var suffix = uniqueString(resourceGroup().id)
var planName = 'asp-${baseName}'
var appName = 'app-${baseName}-${suffix}'
var kvName = 'kv-${baseName}-${substring(suffix, 0, 8)}'
var pgName = 'pg-${baseName}-${suffix}'
var dbName = 'cityops'
var dbNameDev = '${dbName}_dev'
var appHost = '${appName}.azurewebsites.net'
var devSlotHost = '${appName}-${devSlotName}.azurewebsites.net'

// ---------------------------------------------------------------------------
// Azure OpenAI account + model deployment — created (not just referenced). Deterministic
// naming means this adopts and manages a resource that was pre-existing under the same name.
// ---------------------------------------------------------------------------
module openAi 'modules/openai.bicep' = {
  name: 'openAiDeploy'
  params: {
    location: openAiLocation
    name: openAiAccountName
    deploymentName: openAiDeploymentName
    modelName: openAiModelName
    modelVersion: openAiModelVersion
    deploymentSkuName: openAiSkuName
    deploymentCapacity: openAiCapacity
  }
}

// Existing-resource lookup (openAiAccountName is a deterministic top-level variable) so we can
// call listKeys()/read .properties.endpoint — module outputs alone can't do that.
// dependsOn is required here (not just on consumers): without it, ARM resolves this reference
// in parallel with openAiDeploy and can race it on a brand-new resource group.
resource openAiRef 'Microsoft.CognitiveServices/accounts@2023-05-01' existing = {
  name: openAiAccountName
  dependsOn: [
    openAi
  ]
}

// ---------------------------------------------------------------------------
// Data layer
// ---------------------------------------------------------------------------
module postgres 'modules/postgres.bicep' = {
  name: 'postgresDeploy'
  params: {
    location: dbLocation
    name: pgName
    adminLogin: pgAdminLogin
    adminPassword: pgAdminPassword
    dbName: dbName
    dbNameDev: dbNameDev
  }
}

var databaseUrlProd = 'postgresql://${pgAdminLogin}:${uriComponent(pgAdminPassword)}@${postgres.outputs.fqdn}:5432/${dbName}?sslmode=require'
var databaseUrlDev = 'postgresql://${pgAdminLogin}:${uriComponent(pgAdminPassword)}@${postgres.outputs.fqdn}:5432/${dbNameDev}?sslmode=require'

// ---------------------------------------------------------------------------
// Security layer — Key Vault (RBAC) + secrets
// ---------------------------------------------------------------------------
module keyVault 'modules/keyvault.bicep' = {
  name: 'keyVaultDeploy'
  params: {
    location: location
    name: kvName
  }
}

// Existing-resource lookup so child secrets/role assignments can use a proper 'scope'/'parent'.
// kvName is a deterministic top-level variable (not a module output), so this is valid here
// even though the vault itself is created by the module above (ordered via dependsOn).
// dependsOn is required here too — see openAiRef for why relying on consumers' dependsOn alone
// isn't sufficient to prevent ARM from racing this lookup against keyVaultDeploy.
resource keyVaultRef 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: kvName
  dependsOn: [
    keyVault
  ]
}

resource secretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVaultRef
  name: 'DATABASE-URL'
  properties: {
    value: databaseUrlProd
  }
  dependsOn: [
    keyVault
  ]
}

resource secretDatabaseUrlDev 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVaultRef
  name: 'DATABASE-URL-DEV'
  properties: {
    value: databaseUrlDev
  }
  dependsOn: [
    keyVault
  ]
}

resource secretAuthSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVaultRef
  name: 'AUTH-SECRET'
  properties: {
    value: authSecret
  }
  dependsOn: [
    keyVault
  ]
}

// Pulled from the existing OpenAI account via listKeys() — never exposed as a deployment output.
resource secretOpenAiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVaultRef
  name: 'AZURE-OPENAI-API-KEY'
  properties: {
    value: openAiRef.listKeys().key1
  }
  dependsOn: [
    keyVault
    openAi
  ]
}

// ---------------------------------------------------------------------------
// Compute layer — App Service plan + Web App (Node 20, code deploy) + dev slot
// ---------------------------------------------------------------------------
var commonAppSettings = [
  {
    name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
    value: 'false'
  }
  {
    name: 'WEBSITE_NODE_DEFAULT_VERSION'
    value: '~24'
  }
  {
    name: 'NODE_ENV'
    value: 'production'
  }
  {
    name: 'STORAGE_PROVIDER'
    value: 'local'
  }
  {
    name: 'AZURE_OPENAI_ENDPOINT'
    value: openAiRef.properties.endpoint
  }
  {
    name: 'AZURE_OPENAI_DEPLOYMENT'
    value: openAiDeploymentName
  }
  {
    name: 'AZURE_OPENAI_API_KEY'
    value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=AZURE-OPENAI-API-KEY)'
  }
]

var prodAppSettings = [
  {
    name: 'NEXTAUTH_URL'
    value: 'https://${appHost}'
  }
  {
    name: 'DATABASE_URL'
    value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=DATABASE-URL)'
  }
  {
    name: 'AUTH_SECRET'
    value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=AUTH-SECRET)'
  }
]

var devAppSettings = [
  {
    name: 'NEXTAUTH_URL'
    value: 'https://${devSlotHost}'
  }
  {
    name: 'DATABASE_URL'
    value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=DATABASE-URL-DEV)'
  }
  {
    name: 'AUTH_SECRET'
    value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=AUTH-SECRET)'
  }
]

module appService 'modules/appservice.bicep' = {
  name: 'appServiceDeploy'
  params: {
    location: location
    planName: planName
    appName: appName
    devSlotName: devSlotName
    skuName: appServiceSkuName
    skuTier: appServiceSkuTier
    alwaysOn: alwaysOn
    commonAppSettings: commonAppSettings
    prodAppSettings: prodAppSettings
    devAppSettings: devAppSettings
    stickyAppSettingNames: [
      'DATABASE_URL'
      'NEXTAUTH_URL'
    ]
  }
  dependsOn: [
    secretDatabaseUrl
    secretDatabaseUrlDev
    secretAuthSecret
    secretOpenAiKey
  ]
}

// Grant both the production Web App and the dev slot's managed identity read access
// to Key Vault secrets (RBAC). 'name'/'scope' must be deterministic, so they're built from
// the pre-computed appName/devSlotName/kvName variables and the 'existing' vault reference
// above — not from module outputs (which aren't resolvable until the nested deployment runs).
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User

resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultRef.id, resourceId('Microsoft.Web/sites', appName), kvSecretsUserRoleId)
  scope: keyVaultRef
  properties: {
    principalId: appService.outputs.webAppPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
  dependsOn: [
    keyVault
  ]
}

resource kvRoleAssignmentDevSlot 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultRef.id, resourceId('Microsoft.Web/sites/slots', appName, devSlotName), kvSecretsUserRoleId)
  scope: keyVaultRef
  properties: {
    principalId: appService.outputs.devSlotPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
  dependsOn: [
    keyVault
  ]
}

output webAppName string = appName
output webAppUrl string = 'https://${appHost}'
output devSlotName string = devSlotName
output devSlotUrl string = 'https://${devSlotHost}'
output keyVaultName string = kvName
output postgresFqdn string = postgres.outputs.fqdn

