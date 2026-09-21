# CityOps Copilot Instructions

CityOps is a multi-tenant civic reporting platform for UK citizens and local authorities. Treat tenant isolation, role enforcement, report lifecycle rules, and audit history as core domain behavior, not optional hardening. Use `docs/product-requirements.md`, `docs/technical-architecture.md`, `docs/data-model.md`, and `docs/rbac.md` when changing those areas.

## Build, test, and lint

The root package is the CityOps application. Local development requires Node.js 20+, PostgreSQL with PostGIS, and the environment described in `.env.example`.

```bash
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev                 # Next.js dev server on http://localhost:3000

npm run lint
npm run test                # all Vitest unit and integration tests
npm run test:unit
npm run test:integration
npm run test:coverage
npm run build               # production Next.js build

npm run test:e2e            # Chromium functional Playwright suite
npm run test:ui             # Firefox, WebKit, mobile, accessibility, and visual projects
npm run test:load           # k6 load test
npm run db:validate
```

Run one Vitest file or test by passing selectors directly:

```bash
npx vitest run src/__tests__/unit/lib/session.test.ts
npx vitest run src/__tests__/integration/api/reports/route.test.ts -t "returns 401"
```

Run one Playwright spec or named project:

```bash
npx playwright test e2e/reports.spec.ts --project=chromium
npx playwright test e2e/a11y.spec.ts --project=a11y
```

Vitest uses `src/__tests__/setup.ts`, jsdom, Testing Library, and MSW with unhandled requests treated as errors. It deliberately runs in one non-isolated worker; do not change this casually because it avoids jsdom/MSW worker startup failures in CI. Integration tests require PostgreSQL/PostGIS and applied migrations.

The separate `workshop/` Next.js application renders the training curriculum and is excluded from the root TypeScript and ESLint projects:

```bash
npm run workshop:build
npm --prefix workshop run check
npm --prefix workshop run lint
```

Infrastructure is Bicep under `infra/`. Its focused tests are Pester files:

```powershell
Invoke-Pester -Path infra\tests\Bicep.Unit.Tests.ps1
Invoke-Pester -Path infra\tests\Infra.Integration.Tests.ps1
```

Before committing application changes, run the relevant focused tests plus `npm run lint` and `npm run build`. Do not commit automatically; ask first.

## Architecture

- **Deployable shape:** The production application is a Next.js 16 App Router modular monolith. Public routes live in `src/app/(public)`, council operations in `src/app/staff`, and HTTP endpoints in `src/app/api`. `workshop/` is a separate documentation/training site, not an application module.
- **Domain boundaries:** UI components live under `src/components`; reusable server/integration code under `src/lib`; Prisma reads and writes under `src/db/queries` and `src/db/mutations`. Keep business and persistence logic out of presentation components and thin route handlers where practical.
- **Authentication split:** `auth.config.ts` must remain Edge-safe because `middleware.ts` imports it. It contains JWT/session callbacks only and must not import Prisma, bcrypt, or Node-only modules. `auth.ts` is the Node-runtime Auth.js configuration and adds the credentials provider and database-backed verification.
- **Authorization layers:** `middleware.ts` provides coarse route-prefix checks, but protected pages and every API handler must still authenticate and authorize on the server. Session extensions are typed in `src/types/next-auth.d.ts`; the authoritative user context is `session.user.userId`, `role`, and `tenantId`.
- **Tenant isolation:** Tenant-scoped reads and writes must derive `tenantId` from the authenticated session, not a URL or request body. Every tenant-owned record, related activity/audit row, and raw SQL query must remain tenant-aware. Platform admins use separate `/platform/*` support views and are read-only for tenant operational data; they must not mutate reports through `/staff/*`.
- **Data access:** Prisma 7 uses the generated client in `src/generated/prisma`, not `@prisma/client`. Import the shared lazy client from `@/lib/prisma`; it uses `@prisma/adapter-pg` and permits builds without eagerly requiring `DATABASE_URL`.
- **Geospatial fields:** Prisma models contain unsupported PostGIS geography columns. Follow the existing parameterized tagged-template `$queryRaw`/`$executeRaw` pattern for coordinates. PostGIS uses longitude, latitude order in `ST_MakePoint`.
- **Report workflow:** The canonical status sequence is `created -> under_validation -> validated/invalid -> assigned -> in_progress -> resolved -> closed`. Mutations must validate allowed transitions and write corresponding `ReportActivity`/audit data, preferably in the same transaction.
- **External integrations:** Azure Blob Storage, Azure OpenAI validation, email, and observability are adapters in `src/lib`. Keep failures explicit and preserve human-review/auditability for AI decisions.

## Repository-specific conventions

- Use strict TypeScript and the `@/*` alias for `src/*`; use `@auth` for the root `auth.ts`. Do not use `any`, CommonJS `require`, or class React components.
- Prefer Server Components. Add `'use client'` only for hooks, browser APIs, or interactive state. Mark reusable server-only modules with `import "server-only"` when importing them from a client bundle would be unsafe.
- Validate incoming API payloads with Zod and return explicit 4xx responses for unauthenticated, unauthorized, malformed, or invalid input. Do not rely on middleware as the only authorization check.
- Use Prisma transactions when a domain operation changes a report plus attachments, assignments, activities, rewards, or audit records. Do not leave success-shaped partial writes.
- Soft-deleted records use `deletedAt`; normal queries must exclude them unless implementing an explicit audit/support view.
- Prisma schema changes require a new migration and updates to seed/data-model documentation when applicable. Never edit an already-applied migration. Tenant-owned models need a tenant relation and appropriate tenant indexes/unique constraints.
- Tailwind CSS v4 configuration belongs in `src/app/globals.css` via `@theme`, custom variants, layers, and utilities. Do not add `tailwind.config.js` or `tailwind.config.ts`. Reuse the existing theme tokens and shared component classes before introducing local one-off styles.
- Preserve the four role names exactly: `citizen`, `authority_user`, `tenant_admin`, and `platform_admin`. Consult `docs/rbac.md` before changing navigation, redirects, route guards, or data scope.
- Keep the root application and `workshop/` dependency/configuration changes separate. Root lint and TypeScript intentionally ignore generated Prisma code, coverage output, and the workshop.
- Use focused branches (`feature/<name>`, `fix/<name>`, `docs/<name>`, or `chore/<name>`) and conventional commit prefixes. Keep changes scoped; do not introduce microservices without a demonstrated scaling or ownership need.
