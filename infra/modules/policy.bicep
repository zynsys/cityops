// CityOps — Azure Policy assignments applied to the resource group at provision time, so every
// environment is governed identically with no manual `az policy assignment create`. Audit-effect
// policies (built-in or custom) belong here — no managed identity / remediation needed;
// DeployIfNotExists or Modify effects would additionally require an identity + role assignment.
targetScope = 'resourceGroup'

@description('Policy assignments to create on this resource group. Each item: { name, displayName, policyDefinitionId, enforcementMode?, parameters? }.')
param assignments array

resource policyAssignment 'Microsoft.Authorization/policyAssignments@2024-04-01' = [
  for a in assignments: {
    name: a.name
    properties: {
      displayName: a.displayName
      policyDefinitionId: a.policyDefinitionId
      enforcementMode: a.?enforcementMode ?? 'Default'
      parameters: a.?parameters ?? {}
    }
  }
]

output assignmentNames array = [for a in assignments: a.name]
