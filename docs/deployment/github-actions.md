# GitHub Actions deployment

CityOps has two top-level workflows, matching the application/infrastructure split in Azure DevOps.
Checks are jobs, not separate workflows. Shared deployment scripts remain provider-neutral.
To set up a new Azure environment from scratch, follow the [step-by-step setup guide](github-actions-setup.md).

| Workflow | CI | CD |
| --- | --- | --- |
| [Application CI/CD](../../.github/workflows/app-cicd.yml) | CityOps lint, dependency audit, unit/integration coverage, E2E/UI; CodeQL, DevSkim, dependency review; workshop lint/content/build/verification | Automatic dev on relevant main pushes; manual production promotion with independent approval; workshop to GitHub Pages |
| [Infrastructure CI/CD](../../.github/workflows/infra-cicd.yml) | Credential-free Bicep/Pester on PRs; Azure what-if, policy compliance and cost estimate on main | Manual apply with independent approval; outputs and Pester integration results |

## Release policy

- All PRs run application security analysis and the stable **CI gate** check. Change detection selects CityOps/workshop builds without suppressing required PR statuses.
- CityOps E2E/UI run on relevant PRs, nightly and manual validation/releases. They test the downloaded standalone release package rather than rebuilding it.
- Relevant pushes to main deploy CityOps to dev after CI passes, then run health and ZAP checks. Workshop changes deploy to Pages after CI passes.
- Manual application operations are `validate` (default, no deployment), `dev`, `production`, and `load-test`.
- Manual infrastructure operations are `validate` (default, preview only) and `apply`.
- Production/apply operations are allowed only on main and require the protected `prod` environment. They first verify the environment's approval configuration through GitHub's API.
- Production waits for CI, dev deployment and ZAP. It migrates the production database, swaps the tested dev slot and checks production health.
- Runtime deployments do not automatically seed databases. For a demo, explicitly select `seed_demo_data` on a manual dev/production run; it seeds **dev only**. Provision production accounts through an approved administrative process.
- Nightly jobs never deploy. Weekly Monday 04:00 UTC and manual load-test operations run k6 against the existing dev slot; threshold breaches fail the job.

Application release runs, infrastructure apply runs and k6 share the `cityops-azure-release` concurrency group.
The lock spans dev deployment, checks, waiting for production approval, and promotion, so another GitHub run cannot replace the dev slot mid-release.
GitHub concurrency is not a FIFO release queue: at most one running and one pending run are retained.
Cancel obsolete pending releases deliberately. Infrastructure previews do not acquire the release lock.
The lock does not coordinate Azure DevOps or local deployment scripts; keep only one deployment provider active.

## Azure identity and configuration

Run [setup.sh](../../scripts/setup.sh) and select GitHub Actions integration, or run
[setup-github.sh](../../scripts/setup-github.sh) with the configuration exported.
It requires authenticated Azure CLI and `gh` sessions, with GitHub repository admin permission.
Merge the two workflow definitions before running bootstrap.

Setup creates/reuses an Entra application and service principal, federated OIDC credentials for
main, PRs, `dev` and `prod`, and the Azure roles in [configuration.md](configuration.md).
No client secret or publish profile is used. Existing environment protection rules are preserved.
PR Bicep validation does not request Azure credentials; cloud previews are main-only.
Do not introduce `pull_request_target` execution of PR code.

Required repository secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `PG_ADMIN_PASSWORD`
- `AUTH_SECRET`
- `AUTH_SECRET_DEV`

Required repository variables:

- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_DB_LOCATION`
- `AZURE_BASE_NAME`
- `AZURE_OPENAI_ACCOUNT_NAME`
- `ALERT_EMAIL_ADDRESS` (optional; defaults to the commit author email)

See [configuration.md](configuration.md) for defaults and Bicep mappings. Protect workflow,
deployment script and infrastructure changes with code-owner review. The bootstrap identity has
subscription-scoped provisioning permissions; a long-lived production installation should separate
application-release and infrastructure identities and scope their roles to their responsibilities.

## Required GitHub settings (before the demo)

These are repository settings, not settings that YAML can create or enforce by itself.

1. **Settings > Environments > prod**
   - Add at least one independent required reviewer or reviewer team.
   - Enable **Prevent self-review**.
   - Disable **Allow administrators to bypass configured protection rules**.
   - Select deployment branches/tags, with exactly one **branch** rule: `main`. Do not add tag rules.
   - The release preflight fails if any of these settings is missing or cannot be read.
2. **Environments > dev**: allow the main branch only; no approval is needed.
3. **Pages**: source **GitHub Actions**. Restrict the `github-pages` environment to main.
4. **Rulesets > main**
   - Require PRs, review approval, and the **CI gate** status check from GitHub Actions.
   - Require CodeQL code scanning with `high_or_higher` security alerts blocked.
   - Keep CodeQL advanced setup enabled and default setup disabled.
   - After the first consolidated run, verify that CodeQL results are associated with the new workflow.
   - Update any old workflow-specific required checks; do not leave removed checks required.
5. Enable dependency graph, dependency review, code scanning and code-quality features supported by your GitHub plan.
   Keep Dependabot alerts/updates enabled. The repository is private, so verify licensing before the demo.
6. Disable Azure DevOps deployment triggers while demonstrating GitHub releases.

**Private-repository approval availability:** GitHub documents that required environment reviewers
on Free, Pro and Team are public-repository-only. Private repositories need a plan supporting the
feature (such as GitHub Enterprise). Do not replace a real approval gate with a boolean input or
silently bypass it if the feature is unavailable.

## Blocking versus advisory checks

Blocking: lint/build, unit/integration tests, selected E2E/UI and workshop checks, coverage uploads,
high/critical npm audit results, high/critical newly introduced dependencies, scanner execution failures,
CI gate, infrastructure policy compliance, migrations, health checks, approval preflight and k6 thresholds.
CodeQL findings are merge-gated by the code-scanning ruleset; a successful scanner job alone is not
proof that it found no vulnerabilities.

ZAP FAIL alerts and scanner errors block production; warning-level alerts remain advisory (`-I`).
Review the published report before approval. DevSkim publishes SARIF findings; scanning success is
not a severity-based findings gate. Duplication, bundle-size and the existing 60% coverage target
remain explicitly advisory. Azure cost estimates are informational, not a spend guarantee.

## Customer demo sequence

1. Complete bootstrap, environment protections, Pages and main ruleset settings.
2. Merge an infrastructure PR: show credential-free Bicep/Pester, then main's what-if/policy/cost jobs.
3. Run **CityOps Infra CI/CD**, branch **main**, operation **apply**.
4. Review the what-if and cost logs. A second person approves the `prod` deployment.
5. Show infrastructure outputs and post-deploy Pester results.
6. Merge an application PR: show security checks, tests, coverage and the CI gate, then automatic dev deployment and health/ZAP reports.
7. For first-time demo data, manually run operation **dev** with **seed_demo_data** selected.
8. Run **CityOps App CI/CD**, branch **main**, operation **production**.
9. Show the release package passing E2E/UI, dev health and ZAP, then waiting for independent approval.
10. Approve as the second reviewer; show migration, slot swap and production health.
11. Optionally run **load-test** and show the k6 summary. This never deploys.

Migrations must be backward-compatible with both slot versions. A slot swap is not a database
rollback. Back up production before schema changes and follow [runbook.md](runbook.md) for recovery.
Do not approve a release until reports, migration compatibility and the expected commit have been reviewed.

## Validate workflow changes locally

Run `bash scripts/github/check-environment.test.sh` (Bash + jq) for mocked approval regression tests.
Run actionlint against both workflows. Current actionlint versions may not recognise GitHub's
`code-quality: write` permission; suppress only that exact diagnostic after verifying the
[official coverage action requirement](https://github.com/actions/upload-code-coverage#permissions).
Do not suppress other workflow errors.

Artifacts include deploy packages (including required hidden `.next` files), test/coverage reports,
CodeQL/DevSkim SARIF, workshop Pages output, ZAP/k6 summaries and infrastructure outputs/results.
Secrets must never be included in packages or published reports.

References:
[GitHub environment protection rules](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments),
[Azure App Service GitHub Actions/OIDC](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions).
