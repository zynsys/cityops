# Contributing to CityOps

Thank you for helping improve CityOps. Contributions should preserve the platform's tenant isolation, role-based access controls, accessibility, and modular-monolith architecture.

## Before you start

For substantial changes, open an issue first so the problem and proposed approach can be discussed. Review these project references before changing related behavior:

- [Product requirements](docs/product-requirements.md)
- [Technical architecture](docs/technical-architecture.md)
- [Data model](docs/data-model.md)
- [Role-based access control](docs/rbac.md)
- [Security policy](SECURITY.md)

Security vulnerabilities must be reported privately as described in `SECURITY.md`, not through a public issue.

## Local development

Prerequisites and complete setup steps are maintained in the [README](README.md). In summary:

1. Install Node.js 20 or later, npm, and Docker Desktop.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set a local `AUTH_SECRET` of at least 32 characters.
4. Start PostgreSQL/PostGIS and Mailpit with `docker compose up -d`.
5. Run `npm run db:migrate` and `npm run db:seed`.
6. Start the app with `npm run dev`.

Never commit `.env` files, credentials, tokens, production data, or other secrets.

## Make a change

1. Create a focused branch from the latest `main` using `feature/<short-name>` for features or `fix/<short-name>` for fixes. Use an equally clear prefix such as `docs/` or `chore/` for other changes.
2. Keep the change small and avoid unrelated refactoring.
3. Follow the existing TypeScript, React, Next.js, and Tailwind CSS conventions.
4. Add or update tests for changed behavior.
5. Update relevant documentation when behavior, configuration, APIs, or data models change.

Use conventional commit messages such as `feat: add report filtering`, `fix: enforce tenant scope`, or `docs: clarify local setup`.

## Engineering requirements

### Tenant and authorization safety

- Every tenant-owned record and query must be scoped by `tenantId`.
- Resolve and validate tenant context before executing business logic.
- Enforce both role and tenant checks for protected operations.
- Treat cross-tenant access and authorization bypasses as security defects.
- Add negative tests proving that other tenants and unauthorized roles cannot access the changed behavior.

### Application conventions

- Use strict TypeScript without `any`; prefer explicit types or `unknown` with narrowing.
- Use ES modules and functional React components.
- Prefer Server Components; add `'use client'` only for interactivity, hooks, or browser APIs.
- Use Server Actions for form mutations and API routes for webhooks, uploads, or long-running operations.
- Keep business logic out of controllers and presentation components.
- Preserve the modular-monolith boundaries; do not introduce a microservice without a demonstrated need.
- Configure Tailwind CSS v4 in `src/app/globals.css` with `@theme`. Do not add a Tailwind v3 configuration file.

### Database changes

- Update `prisma/schema.prisma` and create a migration for schema changes.
- Ensure every new tenant-owned model includes a tenant relationship and indexed tenant identifier where appropriate.
- Do not edit an already-applied migration; add a new migration instead.
- Consider migration safety, rollback impact, existing data, and seed updates.

## Validate your work

Run the checks relevant to the change before opening a pull request. At minimum, run:

```text
npm run lint
npm run test
npm run build
```

Also run the appropriate focused checks when applicable:

| Change                                   | Additional validation                                          |
| ---------------------------------------- | -------------------------------------------------------------- |
| Database schema                          | `npm run db:validate` and migration tests                      |
| User flows or browser behavior           | `npm run test:e2e`                                             |
| Responsive UI, accessibility, or visuals | `npm run test:ui`                                              |
| Performance-sensitive behavior           | `npm run test:load` or another relevant measurement            |
| Infrastructure                           | The PowerShell tests under `infra/tests/` and Bicep validation |

All checks must pass. Do not weaken, skip, or delete tests merely to make CI green.

## Pull requests

Open a pull request against `main` and include:

- The problem and the chosen solution
- Links to related issues
- Testing performed and the results
- Screenshots or recordings for visible UI changes
- Data migration, deployment, security, and tenant-isolation considerations
- Any follow-up work or known limitations

Keep the branch current with `main`, resolve review feedback, and ensure CI passes. A code owner must review changes before they are merged. Maintainers may ask for changes when a contribution conflicts with product requirements, architecture, security controls, or repository conventions.

## Documentation-only changes

Documentation improvements are welcome. Verify links, commands, spelling, and examples, and keep terminology consistent with the product and architecture documents.
