@description('Azure region for the Azure OpenAI account. Standalone-use fallback only — main.bicep always passes openAiLocation explicitly (default francecentral, confirmed capacity).')
param location string = 'francecentral'

@description('Azure OpenAI (Cognitive Services) account name.')
param name string

@description('Name of the model deployment (e.g. gpt-4o).')
param deploymentName string = 'gpt-4o'

@description('Model name to deploy.')
param modelName string = 'gpt-4o'

@description('Model version to deploy.')
param modelVersion string = '2024-11-20'

@description('Deployment SKU name (capacity/throughput tier).')
param deploymentSkuName string = 'GlobalStandard'

@description('Deployment capacity (TPM units) — subject to per-subscription/region quota.')
param deploymentCapacity int = 100

@description('Tags applied to this resource.')
param tags object = {}

resource account 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: name
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: account
  name: deploymentName
  sku: {
    name: deploymentSkuName
    capacity: deploymentCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
  }
}

output name string = account.name
output endpoint string = account.properties.endpoint
