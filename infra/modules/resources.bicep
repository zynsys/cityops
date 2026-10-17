// CityOps — App Service (code deploy) + PostgreSQL Flexible Server (PostGIS) + Key Vault
// No containers: the Web App runs the Next.js standalone server via `node server.js`.
//
// Invoked as a resource-group-scoped module from ../main.bicep (which creates the resource
// group itself at subscription scope, then calls this module `scope: rg`). Modularized further:
// keyvault.bicep, postgres.bicep, appservice.bicep each own one logical concern (security, data,
// compute). The Azure OpenAI account is created here too (openai.bicep), not just referenced.
targetScope = 'resourceGroup'

@description('Azure region for App Service and Key Vault. Defaults to francecentral — confirmed capacity for all resource types used by this template.')
param location string = 'francecentral'

@description('Region for PostgreSQL. Defaults to francecentral (same as location) — override independently if a future region lacks the Flexible Server SKU.')
param dbLocation string = 'francecentral'

@description('Base name used to derive resource names.')
@minLength(1)
param baseName string = 'cityops'

@description('Tags applied to every resource this template creates — for cost allocation and ownership tracking.')
param tags object = {
  project: 'cityops'
  managedBy: 'bicep'
}

@description('PostgreSQL administrator login.')
param pgAdminLogin string = 'cityopsadmin'

@description('PostgreSQL administrator password.')
@secure()
param pgAdminPassword string

@description('Auth.js (NextAuth) secret for production — at least 32 chars.')
@secure()
param authSecret string

@description('Auth.js (NextAuth) secret for the dev slot — at least 32 chars, distinct from prod.')
@secure()
param authSecretDev string

@description('App Service plan SKU name (S1+ required for deployment slots).')
param appServiceSkuName string = 'S1'

@description('App Service plan SKU tier matching the SKU name.')
param appServiceSkuTier string = 'Standard'

@description('alwaysOn (supported on Standard+).')
param alwaysOn bool = true

@description('Azure OpenAI (Cognitive Services) account name. Matching an existing resource of this name in this resource group adopts it instead of creating a duplicate.')
param openAiAccountName string = 'azopenai-cityops'

@description('Azure region for Azure OpenAI. Defaults to francecentral (same as location) — override independently if model/quota availability requires a different region.')
param openAiLocation string = 'francecentral'

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

@description('Resource ID of the custom "require tags" policy definition (created at subscription scope in main.bicep).')
param requireTagsPolicyId string

@description('Effect for the require-tags policy assignment.')
param requireTagsEffect string = 'Audit'

@description('Email address to notify on app exceptions/failed (5xx) requests. Leave empty to skip creating alert resources (e.g. ad-hoc/local test deployments).')
param alertEmailAddress string = ''

@description('Object ID of the CI/CD service principal that releases to the dev slot. Leave empty to skip its role assignments (local deployments).')
param devReleasePrincipalId string = ''

@description('Object ID of the CI/CD service principal that promotes to production. Leave empty to skip its role assignments (local deployments).')
param prodReleasePrincipalId string = ''

// Deterministic names (no uniqueString suffix) — app/kv/pg/storage names must be globally unique
// across all of Azure, so baseName must be distinctive enough to avoid collisions. The default
// 'cityops' is NOT globally available (app-cityops and stcityops are taken by other tenants), so
// set baseName to something distinctive. scripts/infra/check-names.sh checks every name up front.
// Storage allows only lowercase alphanumerics, so baseName must be lowercase alphanumeric.
var planName = 'asp-${baseName}'
var appName = 'app-${baseName}'
var kvName = 'kv-${baseName}'
var pgName = 'pg-${baseName}'
var dbName = 'cityops'
var dbNameDev = '${dbName}_dev'
var storageName = 'st${baseName}'
var storageContainer = 'report-attachments'
var storageContainerDev = 'report-attachments-dev'
var appHost = '${appName}.azurewebsites.net'
var devSlotName = 'dev'
var devHost = '${appName}-${devSlotName}.azurewebsites.net'

// ---------------------------------------------------------------------------
// Azure OpenAI account + model deployment — created (not just referenced). Deterministic
// naming means this adopts and manages a resource that was pre-existing under the same name.
// ---------------------------------------------------------------------------
module openAi 'openai.bicep' = {
  name: 'openAiDeploy'
  params: {
    location: openAiLocation
    name: openAiAccountName
    deploymentName: openAiDeploymentName
    modelName: openAiModelName
    modelVersion: openAiModelVersion
    deploymentSkuName: openAiSkuName
    deploymentCapacity: openAiCapacity
    tags: tags
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
// Observability — Application Insights + Log Analytics Workspace
// ---------------------------------------------------------------------------
module appInsights 'appinsights.bicep' = {
  name: 'appInsightsDeploy'
  params: {
    location: location
    baseName: baseName
    tags: tags
  }
}

// Opt-in email alerting on app exceptions/failed requests — only created when alertEmailAddress
// is supplied. Bicep can safely reference this conditional module's outputs later in an
// expression guarded by the same !empty(alertEmailAddress) condition (see output below).
module alerts 'alerts.bicep' = if (!empty(alertEmailAddress)) {
  name: 'alertsDeploy'
  params: {
    baseName: baseName
    tags: tags
    appInsightsId: appInsights.outputs.resourceId
    alertEmailAddress: alertEmailAddress
  }
}

// ---------------------------------------------------------------------------
// Data layer
// ---------------------------------------------------------------------------
module postgres 'postgres.bicep' = {
  name: 'postgresDeploy'
  params: {
    location: dbLocation
    name: pgName
    adminLogin: pgAdminLogin
    adminPassword: pgAdminPassword
    dbName: dbName
    dbNameDev: dbNameDev
    tags: tags
  }
}

var databaseUrlProd = 'postgresql://${pgAdminLogin}:${uriComponent(pgAdminPassword)}@${postgres.outputs.fqdn}:5432/${dbName}?sslmode=require'
var databaseUrlDev = 'postgresql://${pgAdminLogin}:${uriComponent(pgAdminPassword)}@${postgres.outputs.fqdn}:5432/${dbNameDev}?sslmode=require'

// ---------------------------------------------------------------------------
// Blob storage — one shared account, two containers (prod + dev). Connection string is built
// from the account key and stored in Key Vault; the app reads it via a Key Vault app-setting
// reference (STORAGE_PROVIDER=azure).
// ---------------------------------------------------------------------------
module storage 'storage.bicep' = {
  name: 'storageDeploy'
  params: {
    location: location
    name: storageName
    containerName: storageContainer
    containerNameDev: storageContainerDev
    tags: tags
  }
}

// Existing-resource lookup so listKeys() can build the connection string (module outputs can't
// expose keys). dependsOn prevents ARM racing this lookup against storageDeploy on a new account.
resource storageRef 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageName
  dependsOn: [
    storage
  ]
}

var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageName};AccountKey=${storageRef.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

// ---------------------------------------------------------------------------
// Security layer — Key Vault (RBAC) + secrets
// ---------------------------------------------------------------------------
module keyVault 'keyvault.bicep' = {
  name: 'keyVaultDeploy'
  params: {
    location: location
    name: kvName
    tags: tags
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

// Dev gets its own Auth.js secret so dev sessions are never valid against prod and vice versa.
resource secretAuthSecretDev 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVaultRef
  name: 'AUTH-SECRET-DEV'
  properties: {
    value: authSecretDev
  }
  dependsOn: [
    keyVault
  ]
}

resource secretStorageConnectionString 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVaultRef
  name: 'AZURE-STORAGE-CONNECTION-STRING'
  properties: {
    value: storageConnectionString
  }
  dependsOn: [
    keyVault
  ]
}

// ---------------------------------------------------------------------------
// Compute layer — App Service plan + Web App (Node 20, code deploy)
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
    value: 'azure'
  }
  {
    name: 'AZURE_STORAGE_CONNECTION_STRING'
    value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=AZURE-STORAGE-CONNECTION-STRING)'
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
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: appInsights.outputs.connectionString
  }
  {
    name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
    value: '~3'
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
  {
    name: 'AZURE_STORAGE_CONTAINER'
    value: storageContainer
  }
]

// Dev slot points at its own dedicated database and its own auth secret — genuine isolation
// from prod, on the same App Service plan (no extra compute cost).
var devAppSettings = [
  {
    name: 'NEXTAUTH_URL'
    value: 'https://${devHost}'
  }
  {
    name: 'DATABASE_URL'
    value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=DATABASE-URL-DEV)'
  }
  {
    name: 'AUTH_SECRET'
    value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=AUTH-SECRET-DEV)'
  }
  {
    name: 'AZURE_STORAGE_CONTAINER'
    value: storageContainerDev
  }
]

module appService 'appservice.bicep' = {
  name: 'appServiceDeploy'
  params: {
    location: location
    planName: planName
    appName: appName
    skuName: appServiceSkuName
    skuTier: appServiceSkuTier
    alwaysOn: alwaysOn
    commonAppSettings: commonAppSettings
    prodAppSettings: prodAppSettings
    devAppSettings: devAppSettings
    devSlotName: devSlotName
    tags: tags
    stickyAppSettingNames: [
      'DATABASE_URL'
      'AUTH_SECRET'
      'NEXTAUTH_URL'
      'AZURE_STORAGE_CONTAINER'
    ]
  }
  dependsOn: [
    secretDatabaseUrl
    secretDatabaseUrlDev
    secretAuthSecret
    secretAuthSecretDev
    secretStorageConnectionString
  ]
}

// Grant the production Web App's managed identity read access to Key Vault secrets (RBAC).
// 'name'/'scope' must be deterministic, so they're built from the pre-computed appName/kvName
// variables and the 'existing' vault reference above — not from module outputs (which aren't
// resolvable until the nested deployment runs).
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

// The dev slot has its own managed identity — grant it the same read-only access to Key Vault.
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

// Azure OpenAI has API key auth disabled (disableLocalAuth) — the app authenticates with Entra ID
// via its managed identity instead, so both slots need this role directly on the OpenAI account.
var cognitiveServicesOpenAiUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd' // Cognitive Services OpenAI User

resource openAiRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAiRef.id, resourceId('Microsoft.Web/sites', appName), cognitiveServicesOpenAiUserRoleId)
  scope: openAiRef
  properties: {
    principalId: appService.outputs.webAppPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAiUserRoleId)
    principalType: 'ServicePrincipal'
  }
  dependsOn: [
    openAi
  ]
}

resource openAiRoleAssignmentDevSlot 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAiRef.id, resourceId('Microsoft.Web/sites/slots', appName, devSlotName), cognitiveServicesOpenAiUserRoleId)
  scope: openAiRef
  properties: {
    principalId: appService.outputs.devSlotPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAiUserRoleId)
    principalType: 'ServicePrincipal'
  }
  dependsOn: [
    openAi
  ]
}

// ---------------------------------------------------------------------------
// CI/CD release identities — least privilege, managed as code so a redeploy restores them.
// Dev release: deploy to the dev slot and read only the dev database secret.
// Production release: swap slots on the site and read only the production database secret.
// Both get Reader on the resource group to verify the environment before deploying.
// ---------------------------------------------------------------------------
var readerRoleId = 'acdd72a7-3385-48ef-bd42-f606fba81ae7' // Reader
var websiteContributorRoleId = 'de139f84-1756-47ae-9be6-808fbbbdf0ee' // Website Contributor

resource webAppRef 'Microsoft.Web/sites@2023-12-01' existing = {
  name: appName
  dependsOn: [
    appService
  ]
}

resource devSlotRef 'Microsoft.Web/sites/slots@2023-12-01' existing = {
  parent: webAppRef
  name: devSlotName
}

resource devReleaseReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(devReleasePrincipalId)) {
  name: guid(resourceGroup().id, devReleasePrincipalId, readerRoleId)
  properties: {
    principalId: devReleasePrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', readerRoleId)
    principalType: 'ServicePrincipal'
  }
}

resource devReleaseSlotContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(devReleasePrincipalId)) {
  name: guid(devSlotRef.id, devReleasePrincipalId, websiteContributorRoleId)
  scope: devSlotRef
  properties: {
    principalId: devReleasePrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', websiteContributorRoleId)
    principalType: 'ServicePrincipal'
  }
}

resource devReleaseDatabaseSecret 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(devReleasePrincipalId)) {
  name: guid(secretDatabaseUrlDev.id, devReleasePrincipalId, kvSecretsUserRoleId)
  scope: secretDatabaseUrlDev
  properties: {
    principalId: devReleasePrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

resource prodReleaseReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(prodReleasePrincipalId)) {
  name: guid(resourceGroup().id, prodReleasePrincipalId, readerRoleId)
  properties: {
    principalId: prodReleasePrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', readerRoleId)
    principalType: 'ServicePrincipal'
  }
}

resource prodReleaseSiteContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(prodReleasePrincipalId)) {
  name: guid(webAppRef.id, prodReleasePrincipalId, websiteContributorRoleId)
  scope: webAppRef
  properties: {
    principalId: prodReleasePrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', websiteContributorRoleId)
    principalType: 'ServicePrincipal'
  }
}

resource prodReleaseDatabaseSecret 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(prodReleasePrincipalId)) {
  name: guid(secretDatabaseUrl.id, prodReleasePrincipalId, kvSecretsUserRoleId)
  scope: secretDatabaseUrl
  properties: {
    principalId: prodReleasePrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

// ---------------------------------------------------------------------------
// Governance — Azure Policy assignments on this resource group. Effect is Audit
// by default; the app pipeline's PolicyCompliance gate reads this compliance
// state and blocks a deploy on any violation (see docs/deployment-guidelines.md §11.5).
// Audit/Deny need no managed identity.
// ---------------------------------------------------------------------------
var policyAssignments = [
  {
    name: 'cityops-require-tags'
    displayName: 'CityOps: require a governance tag on resources'
    policyDefinitionId: requireTagsPolicyId
    parameters: {
      effect: {
        value: requireTagsEffect
      }
    }
  }
]

module policy 'policy.bicep' = {
  name: 'policyDeploy'
  params: {
    assignments: policyAssignments
  }
}

output webAppName string = appName
output webAppUrl string = 'https://${appHost}'
output devSlotName string = devSlotName
output devSlotUrl string = 'https://${devHost}'
output keyVaultName string = kvName
output postgresFqdn string = postgres.outputs.fqdn
output postgresServerName string = postgres.outputs.serverName
output resourceGroupName string = resourceGroup().name
output appInsightsName string = appInsights.outputs.appInsightsName
output actionGroupName string = alerts.?outputs.actionGroupName ?? ''

