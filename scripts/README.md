# CityOps deployment scripts

These scripts provide provider-neutral deployment behavior used by local setup, GitHub Actions, and Azure DevOps.

| Script                          | Purpose                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `setup.sh`                      | Interactive local infrastructure orchestrator with optional CI bootstrap and dev app deployment |
| `setup-ado.sh`                  | Azure DevOps service connection, variable group, environment, and pipeline bootstrap            |
| `setup-github.sh`               | GitHub OIDC app registration, Azure roles, repository secrets, variables, and environments      |
| `cleanup.sh`                    | Teardown for Azure, Azure DevOps, and GitHub configuration created by setup                     |
| `deploy-app.sh`                 | Explicit local dev deployment or production slot promotion                                      |
| `infra/deploy.sh`               | Canonical Bicep validate, what-if, and deploy entry point                                       |
| `infra/check-names.sh`          | Preflight check for globally unique Azure resource names                                        |
| `infra/smoke-test.sh`           | Infrastructure integration tests using deployment outputs                                       |
| `app/assemble-package.sh`       | Assemble Next.js standalone output                                                              |
| `app/resolve-azure-names.sh`    | Resolve deterministic App Service and Key Vault names                                           |
| `app/verify-azure-resources.sh` | Fail fast when app deployment resources are missing                                             |
| `app/smoke-test.sh`             | Retry an application health endpoint                                                            |
| `github/check-environment.sh` | Fail closed unless production requires independent approval and main-only deployments |
| `github/check-environment.test.sh` | Mocked regression tests for GitHub approval protection checks (Bash + jq) |
| `npm-ci.sh`                     | Install dependencies with bounded retries                                                       |

See [`docs/deployment/README.md`](../docs/deployment/README.md) before deploying.
