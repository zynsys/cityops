// CityOps — custom Azure Policy definitions. Policy definitions can only be created at
// subscription or management-group scope (never resource group), so this module is
// subscription-scoped and its output IDs are assigned to the resource group in resources.bicep.
targetScope = 'subscription'

@description('Tag name every resource must carry. The demo compliance policy audits resources missing this tag.')
param requiredTagName string = 'project'

// Custom "require a tag" policy. Effect is an assignment-time parameter (Audit by default;
// switch to Deny to block non-compliant resource creation during the deployment itself).
resource requireTags 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'cityops-require-tags'
  properties: {
    policyType: 'Custom'
    mode: 'Indexed'
    displayName: 'CityOps: require the "${requiredTagName}" tag on resources'
    description: 'Audits or denies resources that are missing the required governance tag.'
    metadata: {
      category: 'Tags'
    }
    parameters: {
      effect: {
        type: 'String'
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Audit'
        metadata: {
          displayName: 'Effect'
          description: 'Enable or disable enforcement of the policy.'
        }
      }
    }
    policyRule: {
      if: {
        field: 'tags[\'${requiredTagName}\']'
        exists: 'false'
      }
      then: {
        effect: '[parameters(\'effect\')]'
      }
    }
  }
}

output requireTagsPolicyId string = requireTags.id
