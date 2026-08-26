// CityOps — subscription-scoped orchestrator: creates the resource group itself, then deploys
// everything else (App Service, PostgreSQL, Key Vault, Azure OpenAI) into it via a nested
// resource-group-scoped module. This means the infra pipeline never needs a resource group to
// pre-exist — one manual `az group create` less to run before the pipeline can work end to end.
//
// NOTE: creating a resource group requires the deploying identity to have a role assignment at
// SUBSCRIPTION scope (you can't scope a role assignment to a resource group that doesn't exist
// yet) — a broader grant than resource-group-scoped least privilege. See
// docs/deployment-guidelines.md §3.1 for the required role assignment.
targetScope = 'subscription'

@description('Name of the resource group to create (if missing) and deploy into.')
param resourceGroupName string = 'rg-cityops'

@description('Azure region for the resource group itself, and for App Service / Key Vault. Defaults to francecentral — confirmed capacity for all resource types used by this template.')
param location string = 'francecentral'

@description('Region for PostgreSQL. Defaults to francecentral (same as location) — override independently if a future region lacks the Flexible Server SKU.')
param dbLocation string = 'francecentral'

@description('Base name used to derive resource names.')
param baseName string = 'cityops'

@description('Tags applied to the resource group and every resource this template creates — for cost allocation and ownership tracking.')
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

@description('Effect for the custom require-tag policy. Audit reports compliance for the app pipeline gate to read (and allows the remove-tag demo); Deny would instead block non-compliant resource creation during the deployment.')
@allowed([
  'Audit'
  'Deny'
  'Disabled'
])
param requireTagsEffect string = 'Audit'

@description('Tag name the require-tag policy checks for. Defaults to project (Bicep already applies it, so resources pass); set to a tag nothing has to demo a blocked deploy.')
param requiredTagName string = 'project'

@description('Email address to notify on app exceptions/failed (5xx) requests. Leave empty to skip creating alert resources.')
param alertEmailAddress string = ''

// Custom policy definitions live at subscription scope (can't be created on a resource group),
// then get assigned to the resource group inside resources.bicep.
module policyDefinitions 'modules/policy-definitions.bicep' = {
  name: 'policyDefinitionsDeploy'
  params: {
    requiredTagName: requiredTagName
  }
}

module resourceGroup 'modules/resourcegroup.bicep' = {
  name: 'resourceGroupDeploy'
  params: {
    name: resourceGroupName
    location: location
    tags: tags
  }
}

module resources 'modules/resources.bicep' = {
  name: 'resourcesDeploy'
  scope: az.resourceGroup(resourceGroupName)
  dependsOn: [
    resourceGroup
  ]
  params: {
    location: location
    dbLocation: dbLocation
    baseName: baseName
    tags: tags
    pgAdminLogin: pgAdminLogin
    pgAdminPassword: pgAdminPassword
    authSecret: authSecret
    authSecretDev: authSecretDev
    appServiceSkuName: appServiceSkuName
    appServiceSkuTier: appServiceSkuTier
    alwaysOn: alwaysOn
    openAiAccountName: openAiAccountName
    openAiLocation: openAiLocation
    openAiDeploymentName: openAiDeploymentName
    openAiModelName: openAiModelName
    openAiModelVersion: openAiModelVersion
    openAiSkuName: openAiSkuName
    openAiCapacity: openAiCapacity
    requireTagsPolicyId: policyDefinitions.outputs.requireTagsPolicyId
    requireTagsEffect: requireTagsEffect
    alertEmailAddress: alertEmailAddress
  }
}

output webAppName string = resources.outputs.webAppName
output webAppUrl string = resources.outputs.webAppUrl
output devSlotName string = resources.outputs.devSlotName
output devSlotUrl string = resources.outputs.devSlotUrl
output keyVaultName string = resources.outputs.keyVaultName
output postgresFqdn string = resources.outputs.postgresFqdn
output postgresServerName string = resources.outputs.postgresServerName
output resourceGroupName string = resources.outputs.resourceGroupName
output actionGroupName string = resources.outputs.actionGroupName
