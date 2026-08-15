// Creates (or adopts, if it already exists) the resource group everything else deploys into.
// Invoked as a subscription-scoped module from ../main.bicep.
targetScope = 'subscription'

@description('Name of the resource group to create.')
param name string

@description('Azure region for the resource group.')
param location string

@description('Tags applied to the resource group.')
param tags object = {}

resource rg 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: name
  location: location
  tags: tags
}

output name string = rg.name
output id string = rg.id
