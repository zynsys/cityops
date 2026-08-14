@description('Azure region for the vault.')
param location string

@description('Key Vault name.')
param name string

@description('Tags applied to this resource.')
param tags object = {}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
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

output id string = keyVault.id
output name string = keyVault.name
