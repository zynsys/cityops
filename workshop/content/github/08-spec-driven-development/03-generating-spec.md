# Spec Driven Development — Generating a Spec

> **Topic**: Spec Driven Development | **Time**: 20 min

With Speckit installed, you'll write a feature requirement in plain English and use Speckit to generate a structured spec that covers acceptance criteria, data model changes, API contracts, and edge cases.

## Learning Objectives

- Write a feature requirement in plain English
- Use Speckit to generate a structured spec document
- Review and edit the generated spec to match CityOps conventions
- Understand what a good spec looks like

## The Feature: Report Escalation

You'll generate a spec for a new CityOps feature: **Report Escalation** — the ability for a Tenant Admin to escalate a report, bumping its priority and notifying the assigned officer.

This is a realistic feature that touches the data model, API, business rules, and email notifications.

## Step 1 — Write the Feature Requirement

Create a new file `docs/specs/report-escalation.md` and write the requirement in plain English:

```markdown
## Feature: Report Escalation

A Tenant Admin can escalate any report in their council to HIGH priority.
Escalating a report:

- Sets a new `priority` field to `HIGH` on the Report model
- Creates an activity entry with action `escalated`
- Sends an email notification to the assigned officer (if one exists)
- Can only be performed by users with role `TENANT_ADMIN` or higher
- Cannot be performed on reports with status `closed` or `resolved`
```

Keep the requirement short and focused — Speckit will expand it into a full spec.

## Step 2 — Generate the Spec with Speckit

With the requirement file open:

1. Select all the requirement text
2. Open the Command Palette (`Ctrl+Shift+P`)
3. Run **Speckit: Generate Spec from Selection**

Speckit will generate a structured spec covering:

- **Acceptance criteria** — numbered, testable statements
- **Data model changes** — new fields, migrations needed
- **API contract** — endpoint, request shape, response shape
- **Business rules** — the conditions and edge cases
- **Error cases** — what should fail and how

## Step 3 — Review and Edit the Spec

Speckit generates a draft. Review it carefully against CityOps conventions:

**Check the data model section:**

- Does the priority field use a Prisma enum? (It should.)
- Does the migration follow the additive-only pattern? (No destructive changes.)
- Does it include `tenant_id` scoping? (All tenant tables must.)

**Check the API contract:**

- Is it a Server Action (for mutations) or an API route?
- Does it validate the role before acting?
- Does it return the standard `{ success, data, error }` shape?

**Check the business rules:**

- Are the `closed` / `resolved` guard conditions listed?
- Is multi-tenant isolation explicit?

Edit anything that doesn't match. The spec is now your contract — it should be precise.

## Step 4 — Ask Copilot to Review the Spec

Use Copilot to catch anything you missed:

```
#file:docs/specs/report-escalation.md
#file:prisma/schema.prisma
#file:.github/copilot-instructions.md

Review this spec against the CityOps architecture and conventions. Identify:
1. Anything that conflicts with the existing data model
2. Any missing RBAC or tenant isolation requirements
3. Any edge cases not covered
4. Whether the API contract matches CityOps patterns

Do not implement anything — only review.
```

Incorporate any feedback into the spec before moving to implementation.

## Summary

You now have a structured, reviewed spec for the Report Escalation feature. The spec captures:

- What the feature does (acceptance criteria)
- How the data changes (model + migration)
- How the API behaves (contract)
- What should fail (error cases)

In the next module you'll use this spec to drive a full end-to-end implementation with Copilot Agent Mode.
