# CityOps – Workspace Instructions

CityOps is a multi-tenant civic reporting platform: citizens report public issues anywhere in the UK; councils manage and resolve them. See [`docs/product-requirements.md`](../docs/product-requirements.md) for full vision and personas.

## Build & Test

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # prisma generate + next build (run before every commit)
npm run lint         # eslint
npm run db:seed      # seed sample data
npm run db:studio    # Prisma Studio
```

Always run `npm run build` and fix all errors before committing. Never commit a broken build.

## Architecture

- **Stack**: Next.js 16 / React 19 / TypeScript strict / Tailwind CSS v4 / Prisma 7 / PostgreSQL + PostGIS / NextAuth v5
- **Pattern**: Modular monolith. Do NOT propose microservices without a concrete performance bottleneck.
- **Multi-tenancy**: Every tenant-owned table has a `tenant_id`. Middleware enforces tenant context before any business logic. Violations are security defects.
- **RBAC**: 4 roles — Citizen, Authority User, Tenant Admin, Platform Admin. Auth is both role-aware and tenant-aware.
- **Report lifecycle**: `created → under_validation → validated/invalid → assigned → in_progress → resolved → closed`

See [`docs/technical-architecture.md`](../docs/technical-architecture.md) for module boundaries and data patterns.

## Code Conventions

See [`docs/technical-architecture.md`](../docs/technical-architecture.md) for the full standards. Critical gotchas:

### Tailwind CSS v4 — CRITICAL

**Do NOT** create `tailwind.config.ts` or `tailwind.config.js` — those are v3. All theme config goes in `src/app/globals.css` using the `@theme` directive:

```css
@import 'tailwindcss';
@theme {
  --color-primary: oklch(50% 0.2 250);
}
```

### TypeScript

- Strict mode — no `any` types (use `unknown` or proper interfaces)
- ES6 modules only — never `require()` or `module.exports`

### React / Next.js

- Functional components only; no class components
- Server components by default; `'use client'` only for interactivity/hooks/browser APIs
- Server Actions for form mutations; API routes for webhooks, file uploads, long-running ops

### File Layout

```
src/components/[feature]/ComponentName.tsx
src/app/[route]/page.tsx
src/db/queries/[domain].ts
src/db/mutations/[domain].ts
src/lib/[utility].ts
```

### Naming

- Components/Types: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Backend (NestJS)

Controllers validate input and delegate — no business logic. Services own all logic and Prisma calls. Use DTOs with class-validator for all incoming payloads. API responses always follow `{ success, data, error }`.

## AI Interaction & Workflow

See [`docs/product-requirements.md`](../docs/product-requirements.md) for the full workflow. Key rules:

- **Ask before committing** — never auto-commit
- **Conventional commits**: `feat:`, `fix:`, `chore:`, etc.
- **One branch per feature/fix**: `feature/[name]` or `fix/[name]`
- If something isn't working after 2–3 attempts, stop and explain the blocker — don't guess
- Make minimal changes; don't refactor unrelated code or add unasked-for features

## Available Skills & Agents

| Name                 | Invoke when                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `/feature`           | Start, review, or complete a feature via the defined workflow       |
| `Code Scanner` agent | Security scan, code quality review, find `any` types or N+1 queries |
| `ui-reviewer` agent  | Visual UI review, responsiveness, accessibility                     |

## Key Reference Files

| File                                                                  | Contents                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`docs/product-requirements.md`](../docs/product-requirements.md)     | Vision, personas, core features, business rules                     |
| [`docs/technical-architecture.md`](../docs/technical-architecture.md) | Stack decisions, module boundaries, data patterns, coding standards |
| [`docs/data-model.md`](../docs/data-model.md)                         | Full data model documentation                                       |
| [`docs/rbac.md`](../docs/rbac.md)                                     | Role-based access control details                                   |
| [`prisma/schema.prisma`](../prisma/schema.prisma)                     | Full data model (24 models, 11 enums)                               |
