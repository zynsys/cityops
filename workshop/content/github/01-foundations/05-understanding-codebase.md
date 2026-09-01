# Understanding the Codebase

## Scenario

You've just joined the CityOps engineering team. There's no onboarding buddy available today. You've been handed the repository URL and told: _"Get familiar with the codebase — we need you to start contributing next week."_

This module is that onboarding session. You'll explore the project structure, data model, authentication flow, RBAC enforcement, and key patterns entirely by reading the code yourself.

By the end, you'll have the mental model you need — and a real appreciation for how long this kind of manual exploration takes. That sets the stage perfectly for the **Developer Productivity** section that follows, where you'll repeat parts of this same exploration using GitHub Copilot.

> [!NOTE]
> There is no Copilot in this module. The goal is to experience the manual process first-hand. Resist the temptation to ask Copilot for help — that's what the next section is for.

---

## Part 1 — Orient Yourself to the Project Structure

Before opening any code, get a sense of what you're dealing with at the folder level.

1. Open the repository root in VS Code
2. Expand the top-level folders in the Explorer panel and spend a few minutes browsing without clicking into files yet
3. Take note of these top-level items and what they contain:

| Path                         | What to look for                            |
| ---------------------------- | ------------------------------------------- |
| `prisma/`                    | Schema, migrations, seed script             |
| `src/app/`                   | Next.js App Router pages — public vs. staff |
| `src/components/`            | UI components grouped by feature area       |
| `src/db/`                    | Database query and mutation functions       |
| `src/lib/`                   | Server-side utilities and integrations      |
| `src/types/`                 | Shared TypeScript interfaces                |
| `auth.ts` / `auth.config.ts` | Authentication configuration                |
| `middleware.ts`              | Route protection logic                      |
| `.github/`                   | Copilot instructions, skills, prompt files  |

4. Open `src/app/` and expand it. Notice the two routing groups:
   - `(public)/` — citizen-facing pages, accessible without a login
   - `staff/` — staff-facing pages, role-gated

5. Open `src/db/` and expand `queries/` and `mutations/`. Notice queries are split between a top-level folder (citizen-facing) and a `staff/` subfolder. Ask yourself: _why might those be separated?_

> [!NOTE]
> This separation isn't just organisational — it makes it easier to enforce that staff queries always include a `tenant_id` filter, and citizen queries never accidentally expose cross-tenant data.

---

## Part 2 — Understand the Data Model

The data model is the backbone of the application. Everything else flows from it.

1. Open `prisma/schema.prisma`
2. Scroll to the top — notice the generator and datasource blocks. The `postgresqlExtensions` preview feature and `postgis` extension tell you this is a geospatially-aware database.
3. Scroll to the **Enums** section (around line 14). Read each enum carefully:
   - `TenantStatus` — what states can a council be in?
   - `ReportStatus` — map out the full lifecycle: `created → under_validation → validated → assigned → in_progress → resolved → closed`. Note that `invalid` is a terminal branch off `under_validation`.
   - `ReportPriority` — four levels from `low` to `critical`
   - `AiValidationOutcome` — three outcomes: `valid`, `review_required`, `invalid`
   - `ActivityAction` — the complete list of auditable events

4. Now scroll to the **Models** section. There are 24 models — don't try to read every field, but do open each one and understand its purpose. Use these questions to guide you:

   **`Tenant`** — How many relations does it have? Count the relation fields. This tells you how central the tenant concept is to the whole schema.

   **`TenantBoundary`** — Find the `boundary` field. Notice its type: `Unsupported("geography(Geometry,4326)")`. This is a PostGIS geography column — it stores the council's geographic boundary polygon. This is what makes automatic council detection possible.

   **`User`** — Does `User` have a `role` column? Look carefully. You won't find one. Role is _not_ stored on the User directly. Make a note of this — you'll find out why shortly.

   **`UserRole`** — Open this model. Now you see it: roles are stored in a join table between `User` and a tenant. Find the `role` field and its type. This architecture means a user can hold different roles in different tenants.

   **`Report`** — This is the central model. Find:
   - The `tenantId` field — is it nullable? Why might that be?
   - The `status` field and its default value
   - The `locationPoint` field — another PostGIS type
   - The relations to `ReportActivity`, `ReportAttachment`, `AiValidationResult`

   **`ReportActivity`** — Open this model. This is the immutable audit log. Every time a report changes state, a row is inserted here. Find the `action`, `fromStatus`, and `toStatus` fields. Notice there's no `update` method on this table — it's append-only.

   **`AiValidationResult`** — Find the `outcome`, `confidence`, and `reviewedBy` fields. Note that AI decisions are stored separately from the report itself, and a human can override them via `reviewedBy`.

5. Take stock of what you've learned. The data model alone contains:
   - **11 enums** defining all possible states and categories across the system
   - **24 models** covering the full platform — tenants, users, reports, audit trails, AI results, rewards, notifications, and more
   - A consistent `tenant_id` foreign key on every tenant-scoped table
   - PostGIS columns on `TenantBoundary` and `Report` for geospatial capabilities

> [!TIP]
> If anything feels unclear, note the question down. The goal here is to familiarise yourself with the shape of the data — you don't need to understand every field right now.

---

## Part 3 — Trace the Authentication Flow

Now open the authentication files and trace the sign-in flow yourself.

1. Open `auth.config.ts`
   - Notice this file is safe to import at the edge (no Node.js-only imports)
   - Find the `callbacks` section — specifically `jwt` and `session`. What extra fields are being written into the token?

2. Open `auth.ts`
   - This wraps the config with the Prisma adapter, which means sessions are stored in the database
   - Find where `PrismaAdapter` is used

3. Open `middleware.ts` — this runs on **every request** before it reaches a page or API handler. Read through it carefully:
   - Find `PUBLIC_PREFIXES` — these routes require no authentication. Notice `/reports/` is public (citizens can view reports), but `/reports/new` is carved out in `AUTH_REQUIRED_EXACT`.
   - Find `ROLE_RULES` — this array maps route prefixes to required roles. What roles can access `/staff/`? What about `/admin/`? What about `/platform/`?
   - Find the `auth(req => ...)` handler. Trace the logic:
     1. Is the path public? → pass through
     2. Is the user unauthenticated? → redirect to `/sign-in` with `callbackUrl`
     3. Does the user's role match the route's requirement? → if not, redirect to `/403`

4. Open `src/lib/session.ts`
   - Read `getRequiredSession()` — note the `server-only` import at the top. This package causes a build error if this file is ever imported in a client component.
   - Find `hasRole()` — this is the programmatic role check used in Server Actions and API handlers after the middleware has already let the request through.

5. Answer these questions by reading the code — not guessing:
   - Where is the user's role stored after sign-in? (Hint: look at the JWT callback in `auth.config.ts`)
   - What happens if a citizen navigates directly to `/staff/reports`?
   - What prevents a server-only utility from accidentally being used in a React client component?

---

## Part 4 — Understand RBAC and Tenant Isolation

The RBAC model in CityOps is enforced at three distinct layers. You're going to find all three yourself.

### Layer 1 — Middleware (route level)

You've already seen this in Part 3. The `ROLE_RULES` array in `middleware.ts` is the first gate.

### Layer 2 — Query functions (data level)

1. Open `src/db/queries/staff/reports.ts`
2. Find the `getStaffReports` function
3. Look at the `where` clause being built — specifically this line:

   ```typescript
   const where: Prisma.ReportWhereInput = {
     tenantId,
     deletedAt: null,
     ...
   }
   ```

   The `tenantId` parameter is passed in from the page, which gets it from the session. **Every query in this folder follows this same pattern.** If a developer forgets to include it — or passes the wrong one — data from another council would be visible. This is why the pattern is enforced via convention rather than database-level row security at this stage.

4. Now compare with `src/db/queries/reports.ts` (the public version). Open `getRecentReports`. Notice there is **no `tenantId` filter** here — recent reports from all councils are shown publicly on the homepage. That's intentional.

### Layer 3 — Server Actions (mutation level)

1. Open `src/app/staff/reports/` and look for a Server Action file (a `.ts` file with `'use server'` at the top)
2. Find where `getRequiredSession()` is called and how the session's `tenantId` is used to scope the mutation
3. Notice the pattern: session → verify role → use `tenantId` to scope the operation → execute

> [!IMPORTANT]
> Multi-tenancy in CityOps is a **convention**, not a database-enforced constraint (at this stage). Every developer touching query or mutation code is responsible for including the correct `tenant_id` filter. This is one reason the `.github/copilot-instructions.md` file explicitly calls it out as a security requirement — so that Copilot also enforces it when generating code.

---

## Part 5 — Understand the Report Wizard

Trace what happens when a citizen submits a report.

1. Navigate to `src/app/(public)/reports/new/` — this is the 5-step wizard you walked through in the previous module
2. Browse the folder structure — you should see separate components or route segments for each step (Photos, Location, Details, Category, Review)
3. Find the Server Action that handles the final form submission
4. Trace what it does step by step:
   - Input validation (look for Zod schema usage)
   - Council detection from the pin coordinates (look for a call that uses the map location)
   - Report row creation with `status: 'created'`
   - Attachment saving
   - `ReportActivity` creation (the first audit entry)
   - Email notification dispatch

5. Open `src/lib/reportStatusConfig.ts` — this file defines the UI label and colour for each report status. Notice it mirrors the `ReportStatus` enum exactly. When a new status is added to Prisma, this file must also be updated.

---

## Part 6 — Understand the Key Library Files

Open `src/lib/` and work through each file:

1. **`prisma.ts`** — Find the singleton pattern. Why is a singleton needed rather than `new PrismaClient()` on every request? (Hint: think about what happens in Next.js dev mode with hot reload.)

2. **`storage.ts`** — This handles file uploads. Is it calling an Azure SDK or writing to disk? Find the upload function and confirm the local-filesystem approach.

3. **`email.ts`** and **`nodemailer.ts`** — Find the SMTP configuration. Notice it points at `localhost:1025` — Mailpit's SMTP port. Emails sent from the app in development go here and nowhere else.

4. **`ai/`** — Open the folder. Find where the Azure OpenAI call is made. Notice the code checks for the presence of `AZURE_OPENAI_ENDPOINT` before attempting any call — the feature degrades gracefully if the env var is missing.

5. **`validations/`** — Open a validation file. Notice Zod is used throughout for input validation. Each form in the wizard has a corresponding Zod schema.

---

## Part 7 — The `.github/` Folder

This folder shapes how every developer (and Copilot) works in this repository.

1. Open `.github/copilot-instructions.md` — read the whole file. This is injected into every Copilot Chat session for this repo. Notice:
   - It describes the tech stack, architecture patterns, and module boundaries
   - It explicitly calls out multi-tenancy as a **security requirement**
   - It lists the four RBAC roles and where they're enforced
   - It specifies code conventions: no `any`, no class components, Server Components by default

2. Open `.github/instructions/` — scan the files inside. Each one applies to a specific file type or task (e.g., writing queries, creating components).

3. Open `.github/skills/` — these are Agent Skill definitions (`SKILL.md` files). You'll build and use these in the **Extending Copilot** section.

> [!TIP]
> The quality of your `.github/copilot-instructions.md` directly affects the quality of code Copilot generates. The more context it has — architecture decisions, patterns to follow, anti-patterns to avoid — the more useful Copilot becomes. You'll explore this in the **Custom Instructions** module.

---

## Reflection

You've just spent a significant amount of time doing what every developer does when they join a new project: reading files, tracing flows, connecting the dots between models, middleware, queries, and UI. And this is a moderately-sized codebase — real-world enterprise projects can be ten times larger.

Consider how long each part took:

- Reading the schema to understand the data model
- Tracing the auth flow across three files
- Finding where RBAC is enforced at each layer
- Understanding what a Server Action does step by step

Now ask yourself: **what if you could ask questions about this codebase and get grounded, specific answers in seconds?**

That's exactly what the **Developer Productivity** section covers next. You'll use GitHub Copilot's Ask mode, Inline Chat, and Agent mode to navigate this same codebase — and you'll feel the difference first-hand.

---

## Summary

| Concept                          | Where you found it                                    |
| -------------------------------- | ----------------------------------------------------- |
| Data model (24 models, 11 enums) | `prisma/schema.prisma`                                |
| Multi-tenancy enforcement        | `tenant_id` FK on every model + query layer           |
| RBAC — storage                   | `UserRole` join table (not on `User`)                 |
| RBAC — route protection          | `middleware.ts` → `ROLE_RULES`                        |
| RBAC — query scoping             | `tenantId` parameter in `src/db/queries/staff/`       |
| Report lifecycle                 | `ReportStatus` enum + `ReportActivity` model          |
| Geospatial detection             | `TenantBoundary` PostGIS column                       |
| AI validation                    | `src/lib/ai/` + `AiValidationResult` model            |
| Auth session + roles             | `auth.config.ts` JWT callback + `src/lib/session.ts`  |
| Server-only boundary             | `server-only` package in `src/lib/session.ts`         |
| File storage                     | `src/lib/storage.ts` — local filesystem               |
| Email                            | `src/lib/nodemailer.ts` → Mailpit on `localhost:1025` |
| Copilot instructions             | `.github/copilot-instructions.md`                     |

---

## Project Layout

```
cityops/
├── prisma/
│   ├── schema.prisma          # Full data model — 24 models, 11 enums
│   ├── seed.ts                # Database seed script
│   └── migrations/            # Prisma migration history
├── src/
│   ├── app/                   # Next.js App Router — pages, layouts, API routes
│   │   ├── (public)/          # Citizen-facing pages (unauthenticated)
│   │   ├── staff/             # Staff-facing pages (role-gated)
│   │   └── api/               # API route handlers
│   ├── components/            # React components, grouped by feature
│   ├── db/
│   │   ├── queries/           # Read-only Prisma query functions
│   │   └── mutations/         # Write Prisma mutation functions
│   ├── lib/                   # Server-side utilities and integrations
│   ├── types/                 # Shared TypeScript types
│   └── generated/             # Auto-generated Prisma client (do not edit)
├── auth.ts                    # Auth.js (NextAuth v5) configuration
├── auth.config.ts             # Auth config shared between edge & server
├── middleware.ts              # Route protection and tenant context
└── .github/
    ├── copilot-instructions.md
    ├── instructions/          # Task-specific instruction files
    └── skills/                # Agent skill definitions
```

---

## The Data Model

The full schema lives in `prisma/schema.prisma`. It has **24 models and 11 enums**. The key entities to understand:

### Core entities

| Model                 | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `Tenant`              | A council (e.g. BCP Council, Manchester City Council)                |
| `TenantBoundary`      | PostGIS polygon defining the council's geographic area               |
| `User`                | Any registered person — citizen or staff                             |
| `UserRole`            | Maps a user to a role within a specific tenant (the RBAC join table) |
| `Report`              | A submitted civic issue report                                       |
| `ReportAttachment`    | Images uploaded with a report                                        |
| `ReportAssignment`    | Links a report to the staff member handling it                       |
| `ReportComment`       | Comment on a report by a citizen or staff                            |
| `ReportActivity`      | Immutable audit log of every status change and action                |
| `AiValidationResult`  | AI moderation outcome — status, confidence score, model used         |
| `ReportCategory`      | Tenant-configurable issue categories                                 |
| `DuplicateLink`       | Links two reports that have been identified as duplicates            |
| `Notification`        | Emails/messages sent to users on lifecycle events                    |
| `RewardPointLedger`   | Points earned and redeemed by citizens                               |
| `Badge` / `UserBadge` | Achievement system                                                   |

### Multi-tenancy at the schema level

Almost every table has a `tenant_id` foreign key. This is not optional — it is the primary mechanism for keeping council data isolated. Any query that touches tenant-owned data **must** include a `where: { tenant_id: ... }` clause. Missing it is a security defect.

The one exception: `report.tenant_id` is nullable, to handle reports dropped in areas where no council has subscribed yet.

### Report lifecycle

Reports move through these statuses — in order:

```
created → under_validation → validated → assigned → in_progress → resolved → closed
                           ↘ invalid
```

The `ReportActivity` model records every transition with a timestamp, actor, and old/new status, giving a full immutable lifecycle audit trail.

---

## Authentication & Session Management

Authentication is handled by **Auth.js v5** (NextAuth). The key files are:

| File                 | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `auth.config.ts`     | Shared config (providers, callbacks) — safe to run at the edge              |
| `auth.ts`            | Full server-side Auth.js instance — imports Prisma adapter                  |
| `middleware.ts`      | Runs on every request; enforces route protection and injects tenant context |
| `src/lib/session.ts` | Helper to get the current session and resolve tenant context                |

The sign-in flow:

1. User submits credentials → Auth.js verifies against the `User` table (bcrypt)
2. A session is created and stored in the `Session` table via the Prisma adapter
3. On each request, `middleware.ts` reads the session, checks the user's role(s) from `UserRole`, and enforces access

---

## Role-Based Access Control (RBAC)

There are four roles, defined in the `Role` enum in `prisma/schema.prisma`:

| Role             | Who                     | What they can do                                        |
| ---------------- | ----------------------- | ------------------------------------------------------- |
| `citizen`        | Registered public users | Submit reports, track progress, earn rewards            |
| `authority_user` | Council staff           | Review, update, and resolve reports within their tenant |
| `tenant_admin`   | Council administrators  | Manage users, categories, and tenant settings           |
| `platform_admin` | CityOps operators       | Manage all tenants and platform-wide configuration      |

Roles are stored in the `UserRole` join table, not directly on `User`. This allows a user to hold different roles in different tenants (rare, but supported).

**Where access is enforced:**

- `middleware.ts` — protects routes before the request reaches any page or API handler
- `src/db/queries/` — every staff query function accepts a `tenantId` parameter and includes it in the Prisma `where` clause
- Server Actions — validate session and role before executing any mutation

---

## Key Modules in `src/lib/`

| File                         | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `prisma.ts`                  | Singleton Prisma client (server-only)           |
| `session.ts`                 | Get current session + resolved tenant context   |
| `storage.ts`                 | Local filesystem file storage for attachments   |
| `email.ts` / `nodemailer.ts` | Email sending via Mailpit (local)               |
| `email-templates/`           | HTML email templates for each notification type |
| `reportStatusConfig.ts`      | Defines valid status transitions and UI labels  |
| `rewards.ts`                 | Points and badge calculation logic              |
| `ai/`                        | Azure OpenAI integration for image validation   |
| `validations/`               | Zod schemas for form and API input validation   |
| `utils.ts`                   | Shared utility functions                        |

---

## How the Report Wizard Works

When a citizen submits a report, the wizard at `/reports/new` collects data across 5 steps (Photos → Location → Details → Category → Review), then calls a **Server Action** to persist it.

The Server Action in `src/app/(public)/reports/new/` does the following:

1. Validates all input with Zod
2. Resolves the `tenant_id` from the map pin using a PostGIS `ST_Within` query against `TenantBoundary`
3. Creates the `Report` row with `status: created`
4. Saves any uploaded attachments to local storage and records them in `ReportAttachment`
5. Triggers an AI validation job (if Azure OpenAI is configured) to assess the photo
6. Creates the initial `ReportActivity` entry
7. Sends a confirmation email via Mailpit

---

## How Tenant Detection Works

When a citizen drops a pin on the map, the app runs a geospatial query:

```sql
SELECT id FROM tenant
JOIN tenant_boundary ON tenant.id = tenant_boundary.tenant_id
WHERE ST_Within(
  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
  tenant_boundary.boundary
)
```

PostGIS evaluates whether the pin coordinates fall inside any of the stored council boundary polygons. The matching council is returned immediately and shown to the citizen — all without them selecting a council manually.

---

## The Staff Side

Staff pages live under `src/app/staff/`. The layout at `src/app/staff/layout.tsx` wraps all staff routes and verifies the session has an `authority_user`, `tenant_admin`, or `platform_admin` role.

The report list at `src/app/staff/reports/` queries only reports where `tenant_id` matches the logged-in user's tenant — this is where the multi-tenancy guarantee is enforced at the query layer.

Report detail pages show:

- The full lifecycle timeline from `ReportActivity`
- AI validation result from `AiValidationResult`
- Controls to update status, priority, and assignee (via Server Actions)
- Comments thread from `ReportComment`

---

## The `.github/` Folder

This folder is worth knowing about — it shapes how Copilot behaves in this repo:

| Path                              | Purpose                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `.github/copilot-instructions.md` | Repository-wide instructions injected into every Copilot session        |
| `.github/instructions/`           | Task-specific instruction files (e.g., for writing queries, components) |
| `.github/skills/`                 | Agent skill definitions (`SKILL.md` files) used in later modules        |

---

## What You've Learned

You now have a mental model of CityOps built by reading the code directly:

| Concept                      | Where it lives                                                         |
| ---------------------------- | ---------------------------------------------------------------------- |
| Data model and relationships | `prisma/schema.prisma`                                                 |
| Multi-tenancy enforcement    | `tenant_id` on every table + queries in `src/db/queries/`              |
| RBAC                         | `UserRole` table + `middleware.ts` + query layer                       |
| Report lifecycle             | `ReportStatus` enum + `ReportActivity` table + `reportStatusConfig.ts` |
| Geospatial tenant detection  | `TenantBoundary` + PostGIS `ST_Within`                                 |
| AI validation                | `src/lib/ai/` + `AiValidationResult` table                             |
| Authentication               | `auth.ts` + `middleware.ts` + `src/lib/session.ts`                     |
| File storage                 | `src/lib/storage.ts` (local filesystem)                                |
| Email                        | `src/lib/email.ts` + Mailpit                                           |

---

## Up Next: The Same Exploration — With Copilot

You've just done this manually. In the **Developer Productivity** section, starting with **Ask Mode**, you'll use GitHub Copilot to ask questions about this same codebase — getting grounded, specific answers in seconds instead of minutes.

Having done it by hand first makes the comparison concrete: you'll see where Copilot accelerates the process, where it adds surprising context, and where human judgement still matters.
