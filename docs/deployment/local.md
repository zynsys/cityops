# Local script deployment

Use the local path to evaluate or demonstrate CityOps without configuring a CI provider, or to bootstrap Azure DevOps after provisioning.

## Prerequisites

- Bash (Git Bash is supported on Windows).
- Azure CLI with Bicep.
- `jq` and OpenSSL.
- Node.js/npm and `zip` when deploying the application.
- PowerShell 7 and Pester 5.6.1 for infrastructure smoke tests.
- Azure rights described in [configuration.md](configuration.md).

Authenticate with Azure and select the intended subscription before starting.

## Interactive setup

Run `scripts/setup.sh` from the repository root. It:

1. Checks prerequisites and Azure login.
2. Prompts for subscription, deterministic names, regions, and alert email.
3. Asks whether Azure DevOps should be configured. Answering no skips every ADO-specific prompt.
4. Generates missing provisioning secrets.
5. Compiles Bicep and runs `what-if`.
6. Requires explicit confirmation before applying.
7. Writes `infra-outputs.json` and runs Pester infrastructure smoke tests when available.
8. Optionally delegates ADO configuration to `scripts/setup-ado.sh`.
9. Optionally builds and deploys the app to the dev slot.

The default is infrastructure-only with no ADO configuration and no application deployment.

Choose a distinctive base name. It must be lowercase letters and digits only, 22 characters or fewer, and it must be globally unique across Azure. The default `cityops` is already taken by unrelated tenants, so use something like `cityopsuk`. Step 5 fails fast and names the conflict before anything is created.

## Non-interactive setup

Non-interactive apply is deliberately blocked unless `CONFIRM_DEPLOY=true` is set. Supply all stable secrets explicitly and reuse them on later runs. Optional controls include:

| Variable               | Default | Purpose                                             |
| ---------------------- | ------- | --------------------------------------------------- |
| `CONFIGURE_ADO`        | `n`     | Configure ADO after infrastructure deployment       |
| `RUN_WHAT_IF`          | `y`     | Preview changes before apply                        |
| `CONFIRM_DEPLOY`       | unset   | Must be `true` for non-interactive apply            |
| `RUN_INFRA_SMOKE_TEST` | `y`     | Run Pester integration tests when PowerShell exists |
| `DEPLOY_APP`           | `n`     | Deploy the application to the dev slot after setup  |

## Application deployment

Use `scripts/deploy-app.sh dev` to install dependencies, run lint/unit tests, build a standalone package, migrate the development database, deploy to the `dev` slot, and test `/api/health`.

Database seeding is off by default. Set `SEED_DATABASE=true` only for a demonstration or empty non-production database.

Production promotion is intentionally separate: `scripts/deploy-app.sh prod` migrates the production database, swaps `dev` into production, and health-checks production. Interactive execution requires typing `promote`; non-interactive execution requires `CONFIRM_PRODUCTION=true`.

## Safe reruns

Reuse the same resource names and stable secrets. Bicep updates existing resources idempotently. Always review `what-if`; region changes and changes to stateful resources may not be possible in place.
