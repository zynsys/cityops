// CityOps — private endpoint plus private DNS registration for one PaaS resource.

@description('Azure region.')
param location string

@description('Private endpoint name.')
param name string

@description('Resource ID of the target resource (storage account, Key Vault, ...).')
param targetResourceId string

@description('Private link sub-resource, e.g. blob or vault.')
param groupId string

@description('Subnet that hosts the private endpoint.')
param subnetId string

@description('Private DNS zone the endpoint registers its A record in.')
param privateDnsZoneId string

@description('Tags applied to this resource.')
param tags object = {}

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    subnet: {
      id: subnetId
    }
    privateLinkServiceConnections: [
      {
        name: name
        properties: {
          privateLinkServiceId: targetResourceId
          groupIds: [
            groupId
          ]
        }
      }
    ]
  }
}

resource dnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
  parent: privateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: groupId
        properties: {
          privateDnsZoneId: privateDnsZoneId
        }
      }
    ]
  }
}

output id string = privateEndpoint.id
