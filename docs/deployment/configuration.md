# Deployment configuration

The shared scripts use one environment-variable contract. GitHub Actions and Azure DevOps map their native configuration stores into this contract before invoking the scripts.

## Infrastructure mapping

| Shared variable             | Bicep parameter     | Default                    | Local source          | GitHub Actions source                          | Azure DevOps source                             | Secret |
| --------------------------- | ------------------- | -------------------------- | --------------------- | ---------------------------------------------- | ----------------------------------------------- | ------ |
| `AZURE_RESOURCE_GROUP`      | `resourceGroupName` | `rg-cityops`               | Prompt/environment    | `vars.AZURE_RESOURCE_GROUP`                    | `cityops-env.resourceGroup`                     | No     |
| `AZURE_LOCATION`            | `location`          | `francecentral`            | Prompt/environment    | `vars.AZURE_LOCATION`                          | `cityops-env.location`                          | No     |
| `AZURE_DB_LOCATION`         | `dbLocation`        | `francecentral`            | Prompt/environment    | `vars.AZURE_DB_LOCATION`                       | `cityops-env.dbLocation`                        | No     |
| `AZURE_BASE_NAME`           | `baseName`          | `cityops`                  | Prompt/environment    | `vars.AZURE_BASE_NAME`                         | `cityops-env.baseName`                          | No     |
| `AZURE_OPENAI_ACCOUNT_NAME` | `openAiAccountName` | `azopenai-<base>`          | Prompt/environment    | `vars.AZURE_OPENAI_ACCOUNT_NAME`               | `cityops-env.openAiAccountName`                 | No     |
| `ALERT_EMAIL_ADDRESS`       | `alertEmailAddress` | Method-specific user email | Prompt/environment    | `vars.ALERT_EMAIL_ADDRESS`, then commit author | `cityops-env.alertEmailAddress`, then requester | No     |
| `PG_ADMIN_PASSWORD`         | `pgAdminPassword`   | Generated locally only     | Environment/generated | `secrets.PG_ADMIN_PASSWORD`                    | `cityops-infra.pgAdminPassword`                 | Yes    |
| `AUTH_SECRET`               | `authSecret`        | Generated locally only     | Environment/generated | `secrets.AUTH_SECRET`                          | `cityops-infra.authSecret`                      | Yes    |
| `AUTH_SECRET_DEV`           | `authSecretDev`     | Generated locally only     | Environment/generated | `secrets.AUTH_SECRET_DEV`                      | `cityops-infra.authSecretDev`                   | Yes    |

## Stable secrets

Generate the three provisioning secrets once, store them securely, and configure the same values in whichever deployment method is active. A rerun with different values is not harmless:

- Changing `PG_ADMIN_PASSWORD` resets the PostgreSQL administrator password.
- Changing `AUTH_SECRET` invalidates production sessions.
- Changing `AUTH_SECRET_DEV` invalidates development-slot sessions.

Local setup prints generated values once at completion. Never commit them to this repository or place them in a non-secret pipeline variable.

## Naming

Resource names have no random deployment hash. Reusing a base name and resource group updates the same deployment.

The base name must be **lowercase letters and digits only** and **22 characters or fewer**, because the storage account is named `st<baseName>` and storage accounts disallow hyphens and exceed limits beyond 24 characters.

App Service, Key Vault, PostgreSQL, and storage names are globally unique across all Azure tenants. The default `cityops` is **already taken** by unrelated tenants for `app-cityops` and `stcityops`, so choose a distinctive base name such as `cityopsuk`.

`scripts/infra/check-names.sh` runs automatically during `validate` and reports each name as available, already owned by your subscription (safe to update), or taken by another tenant. A name owned by your own subscription is not a conflict; Bicep adopts and updates it.

## Required Azure permissions

Because `infra/main.bicep` creates the resource group at subscription scope, the deploying identity needs subscription-scoped permissions:

- `Contributor` to create and update resources.
- `User Access Administrator` to create Key Vault role assignments.
- `Key Vault Secrets User` for pipeline application-deployment secret retrieval.

The local signed-in user can instead hold `Owner`, which includes the required control-plane permissions, while Key Vault data-plane access remains separately governed.

## Shared script operations

The canonical infrastructure command is `scripts/infra/deploy.sh` with one of:

- `validate` — compile Bicep and check global name availability without changing Azure.
- `what-if` — preview subscription deployment changes.
- `deploy` — apply and write `infra-outputs.json`.

Callers must authenticate first and export the configuration above. Provider-specific YAML should not duplicate Bicep parameter mapping.
