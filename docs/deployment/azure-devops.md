# Azure DevOps deployment

Use Azure DevOps to demonstrate ADO-native application and infrastructure CI/CD.

## Pipelines

- `.ado/infra-cicd.yml` validates, previews, estimates cost, checks policy compliance, applies Bicep, publishes outputs, and runs infrastructure tests.
- `.ado/app-cicd.yml` builds/tests, deploys the dev slot, runs security/UI tests, and promotes to production only on a manually queued run.

Provider-neutral commands call shared scripts. ADO remains responsible for service-connection authentication, triggers, environments, approvals, exclusive locks, variable groups, tests, and artifacts.

## Bootstrap

`scripts/setup.sh` can invoke `scripts/setup-ado.sh` after local infrastructure deployment. The dedicated script can also be run directly when its required environment variables are supplied.

It creates or reconciles:

- The ARM service principal and role assignments.
- The `cityops-azure-service-connection` service connection.
- An optional GitHub repository service connection.
- `cityops-env` and `cityops-infra` variable groups.
- Pipeline registrations.
- Best-effort `dev` and `prod` environment creation.

The Azure CLI service-connection command uses a client secret. For a long-lived production environment, create an ARM workload-identity-federation service connection in the ADO UI instead.

## Variable groups

`cityops-env` contains the non-secret values in [configuration.md](configuration.md). `cityops-infra` contains `pgAdminPassword`, `authSecret`, and `authSecretDev` as secret variables.

The service connection name is intentionally literal in ADO YAML because Azure DevOps validates service resources before runtime variable groups are expanded. If it changes, update both ADO pipelines and the setup default.

## Manual configuration

After bootstrap:

1. Configure `prod` approvals and prevent requester self-approval.
2. Add branch control for `refs/heads/main`.
3. Add an exclusive lock.
4. Configure pipeline retention.

Setup authorizes the ARM service connection for all pipelines, because the connection is created before the pipelines exist. For a shared or long-lived project, set `AUTHORIZE_FOR_ALL_PIPELINES=false` and grant `infra-cicd` and `app-cicd` access individually under Service connections > Security.

## Reference-architecture switching

Disable ADO deployment triggers while demonstrating GitHub Actions. Do not rely on the ADO exclusive lock to coordinate with GitHub concurrency; they are separate systems.
