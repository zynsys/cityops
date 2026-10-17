// CityOps — Storage Account + blob containers for report/avatar attachments.
//
// ONE shared Standard_LRS account (like the shared Postgres server and Key Vault), with TWO
// containers isolating prod from dev by convention: `<container>` (prod) and `<container>-dev`
// (dev) — mirroring the two-databases pattern.
//
// The account is fully private (organisation policy requires it): no anonymous access, no shared
// keys, and public network access disabled. The web app reaches it through a private endpoint and
// authenticates with its managed identity; it serves blobs to browsers at /uploads/... (see
// src/app/uploads/[...path]/route.ts). Containers are still created through ARM (control plane).

@description('Azure region for the storage account.')
param location string

@description('Storage account name (3-24 chars, lowercase alphanumeric, globally unique).')
param name string

@description('Production blob container name.')
param containerName string

@description('Dev-slot blob container name.')
param containerNameDev string

@description('Tags applied to this resource.')
param tags object = {}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: containerName
  properties: {
    publicAccess: 'None'
  }
}

resource containerDev 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: containerNameDev
  properties: {
    publicAccess: 'None'
  }
}

output id string = storageAccount.id
output name string = storageAccount.name
output primaryBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
