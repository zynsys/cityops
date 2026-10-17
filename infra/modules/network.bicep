// CityOps — virtual network for private access to Storage and Key Vault.
//
// The organisation's Azure Policy disables public network access on Storage and Key Vault, so the
// web app joins this VNet (regional VNet integration) and reaches both through private endpoints.
// PostgreSQL and Azure OpenAI stay public, so the app subnet keeps default outbound internet access.

@description('Azure region.')
param location string

@description('Base name used to derive resource names.')
param baseName string

@description('VNet address space.')
param addressPrefix string = '10.60.0.0/22'

@description('Subnet delegated to App Service for VNet integration.')
param appSubnetPrefix string = '10.60.0.0/24'

@description('Subnet hosting the private endpoints.')
param privateEndpointSubnetPrefix string = '10.60.1.0/24'

@description('Tags applied to these resources.')
param tags object = {}

var blobDnsZoneName = 'privatelink.blob.${environment().suffixes.storage}'
var keyVaultDnsZoneName = 'privatelink${replace(environment().suffixes.keyvaultDns, 'vault', 'vaultcore')}'

resource appNsg 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: 'nsg-${baseName}-app'
  location: location
  tags: tags
}

resource privateEndpointNsg 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: 'nsg-${baseName}-pe'
  location: location
  tags: tags
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: 'vnet-${baseName}'
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        addressPrefix
      ]
    }
    subnets: [
      {
        name: 'snet-app'
        properties: {
          addressPrefix: appSubnetPrefix
          networkSecurityGroup: {
            id: appNsg.id
          }
          defaultOutboundAccess: true
          delegations: [
            {
              name: 'appservice'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
        }
      }
      {
        name: 'snet-private-endpoints'
        properties: {
          addressPrefix: privateEndpointSubnetPrefix
          networkSecurityGroup: {
            id: privateEndpointNsg.id
          }
          defaultOutboundAccess: false
        }
      }
    ]
  }
}

resource blobDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: blobDnsZoneName
  location: 'global'
  tags: tags
}

resource keyVaultDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: keyVaultDnsZoneName
  location: 'global'
  tags: tags
}

resource blobDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: blobDnsZone
  name: 'link-${vnet.name}'
  location: 'global'
  tags: tags
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource keyVaultDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: keyVaultDnsZone
  name: 'link-${vnet.name}'
  location: 'global'
  tags: tags
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

output appSubnetId string = vnet.properties.subnets[0].id
output privateEndpointSubnetId string = vnet.properties.subnets[1].id
output blobDnsZoneId string = blobDnsZone.id
output keyVaultDnsZoneId string = keyVaultDnsZone.id
