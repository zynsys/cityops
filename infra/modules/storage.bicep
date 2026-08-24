// CityOps — Storage Account + blob containers for report/avatar attachments.
//
// ONE shared Standard_LRS account (like the shared Postgres server and Key Vault), with TWO
// containers isolating prod from dev by convention: `<container>` (prod) and `<container>-dev`
// (dev) — mirroring the two-databases pattern. Containers use anonymous *blob* read (publicAccess
// 'Blob'), so blobs are readable by direct URL (needed for next/image) but the container cannot be
// listed. Blob names are unguessable UUIDs (see src/app/api/reports/route.ts). Report photos are
// public content anyway (shown on public report pages), so this is an acceptable trade-off.

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
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowSharedKeyAccess: true // connection-string auth uses the account key
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
    publicAccess: 'Blob'
  }
}

resource containerDev 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: containerNameDev
  properties: {
    publicAccess: 'Blob'
  }
}

output name string = storageAccount.name
output primaryBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
