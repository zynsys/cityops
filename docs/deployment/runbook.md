# Deployment runbook

## First deployment

1. Select local scripts, GitHub Actions, or Azure DevOps using [README.md](README.md).
2. Configure the common values and generate stable secrets once.
3. Verify the target subscription and globally unique base name.
4. Review Bicep validation and Azure `what-if` output.
5. Approve the infrastructure apply.
6. Verify `infra-outputs` and infrastructure integration tests.
7. Deploy the app to the dev slot and verify `/api/health`.
8. Promote to production only through an explicit manual action and approval.

## Update infrastructure

Change Bicep, update its tests, and run validation/what-if. Use the currently active deployment provider to apply. Do not switch providers during an in-progress run.

## Switch CI providers

1. Disable deployment triggers in the currently active provider.
2. Copy the same subscription, resource names, regions, and stable secrets into the new provider's stores.
3. Run validation and compare `what-if`; it should target the existing resources rather than create a second deployment.
4. Enable the new provider's approval gates and deployment trigger.
5. Keep only that provider active for apply operations.

## Rotate provisioning secrets

Treat rotation as a planned operation. Back up the current values securely, update the selected provider, review impact, and deploy once. PostgreSQL password rotation affects clients; Auth secret rotation signs users out.

## Roll back the app

The previous production build remains in the dev slot after a swap. Swap the slot back through the active provider or Azure CLI, then run the production health check. Consider database migration compatibility before rolling application code back.

## Failed infrastructure deployment

1. Read the ARM deployment operation failure and preserve `infra-outputs.json` if generated.
2. Correct Bicep/configuration rather than editing managed resources manually.
3. Run validate and `what-if` again.
4. Reapply with identical names and stable secrets; Bicep deployments are incremental and idempotent.

## Teardown

Run `scripts/cleanup.sh`. By default it returns all three systems to their pre-setup state: Azure resources, the Azure DevOps objects setup created, and the GitHub Actions configuration. Every run prints exactly what it will remove and requires typing `delete` to proceed.

Deleting the resource group removes the application, databases, Key Vault, and all other state. Confirm backups and the active subscription first.

Name availability after deletion differs by resource type:

| Resource                                 | Name freed                                                    |
| ---------------------------------------- | ------------------------------------------------------------- |
| Storage account, App Service, PostgreSQL | Once deletion completes                                       |
| Key Vault                                | Only after purge; otherwise reserved for the retention period |
| Azure OpenAI                             | Only after purge                                              |

`PURGE_SOFT_DELETED` defaults to `true`, which waits for resource-group deletion and then purges `kv-<baseName>` and the Azure OpenAI account so the names can be reused immediately. Purging is irreversible and removes any recovery option. Set it to `false` to keep the soft-deleted copies, in which case redeploying under the same base name fails until the retention period expires.

A Key Vault with purge protection enabled cannot be purged at all; redeploy under a different base name instead of waiting.

### What cleanup removes

| Scope        | Removed                                                                                                               | Controlled by           | Default |
| ------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------- |
| Azure        | Resource group and everything in it                                                                                   | `DELETE_RESOURCE_GROUP` | `true`  |
| Azure        | Soft-deleted Key Vault and Azure OpenAI names                                                                         | `PURGE_SOFT_DELETED`    | `true`  |
| Azure DevOps | `infra-cicd`, `app-cicd`, `load-test-cicd`, both variable groups, both service connections, and the service principal | `CLEANUP_ADO`           | `true`  |
| GitHub       | Repository secrets, variables, the `dev` and `prod` environments, and the OIDC app registration                       | `CLEANUP_GITHUB`        | `true`  |

Set any of these to `false` to keep that scope. Azure DevOps cleanup is skipped automatically when no organisation and project are configured.

The Azure DevOps project itself is never removed, only the objects setup created inside it. GitHub environments other than `dev` and `prod` are also left untouched.

Azure DevOps environments are deleted through the REST API, which requires the organisation to be backed by the same Microsoft Entra directory as your `az login`. On a Microsoft-account-backed organisation that call returns `Unauthorized`, and the environments must be removed from Pipelines > Environments instead.

## Common checks

- Wrong subscription: compare local `az account show`, GitHub `AZURE_SUBSCRIPTION_ID`, and the ADO service connection.
- Resource not found: ensure base name and resource group match the infrastructure deployment.
- Key Vault 403: verify both the app slot identity and pipeline identity have the intended data-plane role.
- Name unavailable: choose a more distinctive base name.
- Concurrent deployment: stop one provider and allow the active apply to finish before retrying.
