// Action Group (email) + metric alerts on Application Insights exceptions and failed (5xx)
// requests, so the ops team gets notified by email whenever the deployed app errors.
// Invoked conditionally from resources.bicep — only when alertEmailAddress is non-empty.
targetScope = 'resourceGroup'

@description('Base name used to derive resource names.')
param baseName string

@description('Tags applied to every resource this module creates.')
param tags object = {}

@description('Resource ID of the Application Insights component to alert on.')
param appInsightsId string

@description('Email address to notify when an alert fires.')
param alertEmailAddress string

@description('Number of exceptions within the evaluation window that triggers the exceptions alert.')
param exceptionThreshold int = 0

@description('Number of failed (5xx) requests within the evaluation window that triggers the failed-requests alert.')
param failedRequestThreshold int = 0

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-${baseName}-errors'
  location: 'global'
  tags: tags
  properties: {
    groupShortName: 'cityopsErr'
    enabled: true
    emailReceivers: [
      {
        name: 'opsEmail'
        emailAddress: alertEmailAddress
        useCommonAlertSchema: true
      }
    ]
  }
}

resource exceptionAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-${baseName}-exceptions'
  location: 'global'
  tags: tags
  properties: {
    description: 'Fires when the app raises one or more unhandled exceptions.'
    severity: 2
    enabled: true
    scopes: [
      appInsightsId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'ExceptionsRaised'
          metricName: 'exceptions/count'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: exceptionThreshold
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

resource failedRequestAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-${baseName}-failed-requests'
  location: 'global'
  tags: tags
  properties: {
    description: 'Fires when the app returns one or more failed (5xx) requests.'
    severity: 2
    enabled: true
    scopes: [
      appInsightsId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'FailedRequests'
          metricName: 'requests/failed'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: failedRequestThreshold
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

output actionGroupId string = actionGroup.id
output actionGroupName string = actionGroup.name
