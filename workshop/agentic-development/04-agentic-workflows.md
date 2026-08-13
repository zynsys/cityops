# Exercise 12 — Agentic Workflows

An agentic workflow chains multiple steps — schema change, API route, UI component, seed data — into a single coherent agent session. In this module you'll implement a complete CityOps feature from database to browser in one agent session, reviewing each step before it proceeds.

## Learning Objectives

- Structure a complex, multi-step prompt for effective agentic execution
- Guide the agent through a full-stack feature implementation
- Review and correct intermediate steps before the agent proceeds
- Understand the difference between a single agentic task and a chained workflow

## The Feature: Report Assignment

When a report is validated, an Authority User should be able to assign it to a team member. You'll implement:

1. **Database** — `assignedToId` field on `Report` + migration
2. **API** — `PATCH /api/reports/[id]/assign` route
3. **Server Action** — `assignReport(reportId, userId)` action
4. **UI** — Assign button + staff user dropdown on the report detail page
5. **Seed data** — Update seed to include some pre-assigned reports

> [!NOTE]
> If `assignedToId` already exists in `prisma/schema.prisma`, choose a different unimplemented feature from `docs/specs/` and adapt the workflow steps.

## Step 1 — Plan the Workflow

Before starting the agent, write a structured prompt that covers all layers:

1. Open Copilot Chat in Agent mode
2. Send this planning prompt first (don't ask it to implement yet):

```
I want to implement report assignment in CityOps. Before you write any code, please:

1. Check prisma/schema.prisma — does an assignedToId field already exist on the Report model?
2. Check src/app/api/reports/ — is there an existing assign route?
3. Check src/app/reports/[id]/ — what does the report detail page currently show?
4. List the exact files you'll need to create or modify

Report your findings before proceeding.
```

3. Review the agent's findings — correct any misunderstandings before it starts

## Step 2 — Database Layer

```
Now implement the database change:

1. Add assignedToId (optional UUID) to the Report model in prisma/schema.prisma, as a foreign key to User
2. Add the inverse relation on User (assignedReports Report[])
3. Create a new Prisma migration — do NOT apply it yet, just create it with: npm run db:migrate:create -- --name add-report-assignment

Show me the migration SQL before I apply it.
```

Review the generated migration SQL:

- [ ] Does it add the column as nullable (optional assignment)?
- [ ] Does it add the foreign key constraint correctly?
- [ ] No existing data is lost

Apply the migration:

```bash
npm run db:migrate:deploy
```

## Step 3 — API Route

```
Implement the PATCH /api/reports/[id]/assign route in src/app/api/reports/[id]/assign/route.ts:

- Accept: { assignedToId: string | null } in the request body
- Auth: require AuthorityUser or TenantAdmin role (use getRequiredSession())
- Validation: assignedToId must be a valid UUID if provided; the target user must belong to the same tenant
- DB: update the report's assignedToId — scope the query to the session's tenantId
- Return: the updated report (exclude sensitive fields)
- Error handling: 404 if report not found in tenant, 403 if wrong role, 400 for validation errors
```

Review the generated route — run the RBAC reviewer agent on it:

```
@rbac-reviewer review the new file src/app/api/reports/[id]/assign/route.ts
```

## Step 4 — Server Action

```
Create a Server Action in src/actions/reports.ts (or add to the existing file):

- Function name: assignReport(reportId: string, assignedToId: string | null)
- Call the PATCH API route internally (or query the DB directly using the session's tenantId)
- Revalidate the report detail page path after assignment
- Return a typed result: { success: true } | { success: false; error: string }
```

## Step 5 — UI Component

```
Add an "Assign to" section to the report detail page at src/app/reports/[id]/page.tsx (or a child component):

- Only visible to AuthorityUser and TenantAdmin roles
- Shows a dropdown of staff users in the same tenant (fetched server-side)
- Shows the currently assigned user's name if assigned
- On change, calls the assignReport Server Action
- Optimistic UI update while the action is pending

Keep it as a Server Component with a Client Component only for the interactive dropdown.
```

## Step 6 — Seed Data Update

```
Update prisma/seed.ts to assign some reports to staff users:
- Assign roughly 30% of "in_progress" or "assigned" reports to a random AuthorityUser in the same tenant
- Keep it deterministic (use a fixed seed value)
```

Run the updated seed:

```bash
npm run db:seed
```

## Step 7 — End-to-End Verification

```bash
npm run dev
```

1. Sign in as an Authority User
2. Navigate to a validated report
3. Use the Assign dropdown to assign it to yourself
4. Verify the assignment is saved and displayed
5. Sign out and verify the dropdown is not visible to anonymous users

## Summary

You've implemented a complete feature — database, API, server action, UI — in a single chained agent session. By planning first, reviewing each layer, and using the RBAC reviewer at the API layer, you caught issues early rather than discovering them at the end.

Key takeaways:

- Plan before implementing — ask the agent to survey the codebase before writing code
- Review each layer as it's generated — don't wait until the end
- Use specialised agents (like `@rbac-reviewer`) mid-workflow for targeted checks
- The agent remembers context from earlier in the session — reference previous steps in your prompts

## Resources

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Prisma migrate documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
