# Spec Driven Development — Implementation

> **Topic**: Spec Driven Development | **Time**: 25 min

With a structured spec in hand, you'll now use Copilot Agent Mode to implement the Report Escalation feature from end to end — then validate the implementation against the spec before moving on.

## Learning Objectives

- Drive a full feature implementation from a spec using Copilot Agent Mode
- Use `#file` references to give Copilot the spec as context
- Validate the implementation against the spec
- Identify and close gaps through iteration

## Step 1 — Implement from the Spec

Open Copilot Agent Mode and drive the full implementation. The spec is the source of truth — reference it explicitly:

```
#file:docs/specs/report-escalation.md
#file:prisma/schema.prisma
#file:.github/copilot-instructions.md
#file:src/db/mutations/reports.ts
#file:src/lib/email.ts

Implement the Report Escalation feature exactly as described in the spec.
Follow the existing patterns for:
- Prisma migrations (additive only, no destructive changes)
- Server Actions for mutations (src/db/mutations/)
- Activity log entries (follow the existing activityLog pattern)
- Email notifications via src/lib/email.ts
- RBAC checks (TENANT_ADMIN or higher, tenant-scoped)

Work through the implementation in this order:
1. Prisma schema change + migration
2. Server Action / mutation
3. API route (if needed)
4. UI trigger component
```

Let Agent Mode run through the full implementation. Review each step before accepting.

## Step 2 — Run the Migration

After the schema change is generated:

```bash
npx prisma migrate dev --name add-report-escalation
npx prisma generate
```

Verify the migration is additive — no column drops or table renames.

## Step 3 — Validate Against the Spec

Once implementation is complete, ask Copilot to audit the output against the spec:

```
#file:docs/specs/report-escalation.md

Review the implementation changes in the working tree.
Check each acceptance criterion in the spec — does the implementation satisfy it?
List any gaps, missing validations, or cases where the implementation diverges from the spec.
```

For each gap identified:

1. Decide whether to fix the implementation or update the spec
2. Make the change and re-validate

## Step 4 — Write Tests Against the Spec

The spec gives you ready-made test cases. Ask Copilot to generate them:

```
#file:docs/specs/report-escalation.md
#file:src/db/mutations/reports.ts

Generate unit tests for the escalation mutation.
Cover every acceptance criterion and every error case listed in the spec.
Use the existing test patterns in the project.
```

## Summary

Spec Driven Development with Copilot gives you:

- **A contract** — the spec is the source of truth, not the code
- **Traceable implementation** — every decision links back to a spec criterion
- **Built-in validation** — ask Copilot to audit its own output against the spec
- **Ready-made test cases** — the spec's acceptance criteria become your test suite

In the next module you'll hand off an entire feature to the **Copilot Coding Agent** via a GitHub Issue.

## Resources

- [Speckit documentation](https://speckit.dev/docs)
- [Prisma migrate documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
