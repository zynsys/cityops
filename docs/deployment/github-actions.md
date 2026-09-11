# GitHub Actions deployment

Use GitHub Actions to demonstrate GitHub-native application and infrastructure CI/CD.

## Workflows

- `.github/workflows/infra-cicd.yml` validates, previews, estimates cost, checks policy compliance, applies Bicep, publishes outputs, and runs infrastructure tests.
- `.github/workflows/app-cicd.yml` builds/tests, deploys the dev slot, runs security/UI tests, and promotes to production only on a manually dispatched run.

The workflows call shared scripts for provider-neutral behavior. GitHub remains responsible for OIDC login, triggers, environments, approvals, concurrency, and artifacts.

## Azure identity

Create an Entra application/service principal with a federated credential trusting this repository. Grant the subscription-scoped roles in [configuration.md](configuration.md). Configure these GitHub secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `PG_ADMIN_PASSWORD`
- `AUTH_SECRET`
- `AUTH_SECRET_DEV`

No Azure client secret is required; `azure/login` uses OIDC.

## Repository variables

Configure:

- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_DB_LOCATION`
- `AZURE_BASE_NAME`
- `AZURE_OPENAI_ACCOUNT_NAME`
- `ALERT_EMAIL_ADDRESS` (optional; falls back to the commit author email)

See [configuration.md](configuration.md) for defaults and Bicep mappings.

## Environments and triggers

Create GitHub environments named `dev` and `prod`; add required reviewers to `prod`.

Infrastructure pull requests run validation only. A push to `main` touching infrastructure and a manual dispatch may apply after the `prod` environment gate. App pushes deploy to the dev slot; production app promotion requires manual dispatch and approval.

For the reference architecture, disable GitHub deployment triggers while demonstrating ADO. Validation can remain enabled, but never allow both providers to apply to the same resource group concurrently.

## Results

Infrastructure outputs and Pester results are uploaded as workflow artifacts. Application test, coverage, UI, ZAP, and deployment artifacts remain GitHub-native.
