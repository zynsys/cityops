# Exercise 05 — Prompt Files

Prompt files (`.prompt.md`) are reusable, parameterised prompts that you can run on demand. In this module you'll create prompt files for the recurring CityOps development tasks you've already been doing manually.

## Learning Objectives

- Understand the `.prompt.md` file format and frontmatter
- Create prompt files for scaffolding CityOps-specific code patterns
- Run prompt files from the VS Code command palette
- Understand when to use prompt files vs instruction files

## Background

| File type          | When it runs                                | Best for                          |
| ------------------ | ------------------------------------------- | --------------------------------- |
| `.instructions.md` | Automatically, when matching files are open | Always-on coding standards        |
| `.prompt.md`       | On demand, when you explicitly run it       | Repeatable tasks like scaffolding |

Prompt files live in `.github/prompts/` and are run via the **Copilot: Run Prompt** command (or the `>` button in Chat).

## Exercise 1 — Explore a Prompt File

Before creating your own, look at the prompt file format:

1. Create the directory if it doesn't exist:

```bash
mkdir -p .github/prompts
```

2. Open Copilot Chat and ask:

```
Show me an example .prompt.md file that scaffolds a Next.js Server Action for CityOps. Include frontmatter with mode and description, and reference the coding standards from .github/copilot-instructions.md.
```

3. Review the generated example — note the frontmatter fields:
   - `mode` — which Copilot mode to use (`ask`, `edit`, `agent`)
   - `description` — shown in the command palette
   - `tools` — optional MCP tools to include

## Exercise 2 — Create a Scaffold for a New API Route

CityOps API routes follow a specific pattern: authenticate the session, verify the role, scope to `tenantId`, validate input with Zod, and return typed responses.

1. Create `.github/prompts/new-api-route.prompt.md`
2. Run the following prompt to generate its content:

```
Create a .prompt.md file that scaffolds a new Next.js API route for CityOps. The route should:
- Use the pattern from existing routes in src/app/api/
- Call getRequiredSession() from src/lib/session.ts to authenticate
- Scope all database queries to the user's tenantId
- Validate request body with Zod
- Return proper HTTP status codes
- Include TypeScript types for request and response

The prompt should ask the user to specify: the resource name, HTTP method, and what the route should do.
```

3. Save the generated file to `.github/prompts/new-api-route.prompt.md`
4. Run it via the VS Code command palette: **Copilot: Run Prompt**
5. When prompted, specify: resource = `comment`, method = `POST`, action = `add a comment to a report`

## Exercise 3 — Create a Scaffold for a Report Status Transition

Adding a new report status transition requires changes in multiple places consistently.

1. Create `.github/prompts/new-status-transition.prompt.md` with this content:

```markdown
---
mode: agent
description: Scaffold a new report status transition in CityOps
---

I need to add a new status transition to the CityOps report lifecycle.

**Transition details:**

- From status: ${input:fromStatus:e.g. validated}
- To status: ${input:toStatus:e.g. assigned}
- Role required: ${input:role:e.g. AuthorityUser}
- Trigger: ${input:trigger:e.g. staff assigns the report to a team member}

Please:

1. Verify the transition is valid given the report lifecycle in prisma/schema.prisma
2. Add the transition logic to the appropriate service/action file
3. Ensure the tenantId is checked before allowing the transition
4. Add a comment to the report activity log when the transition occurs

Follow the patterns in existing status transition code.
```

2. Run it and specify: from = `validated`, to = `assigned`, role = `AuthorityUser`, trigger = `staff assigns report`
3. Review the generated code — does it match the existing patterns?

## Exercise 4 — Create a Component Scaffold

1. Create `.github/prompts/new-dashboard-card.prompt.md`
2. Ask Copilot to generate its content:

```
Create a .prompt.md prompt file that scaffolds a new dashboard KPI card for CityOps. It should generate a Server Component that queries live data from Prisma, scoped to the tenantId from the session, and displays a metric with a label and optional trend indicator. Follow the existing card patterns in src/components/dashboard/.
```

3. Run the prompt and create a card for: metric = `average resolution time`, label = `Avg. Resolution Time`

## Summary

You've created reusable prompt files for the three most common CityOps scaffolding tasks: API routes, status transitions, and dashboard cards. Anyone on the team can now run these from the command palette to generate correctly structured code.

Key takeaways:

- Prompt files encode your team's patterns — write them once, use them forever
- `mode: agent` is best for multi-file scaffold tasks
- `${input:name:hint}` creates interactive prompts when the file runs
- Prompt files complement instruction files — instructions set standards, prompts scaffold structure

## Resources

- [Prompt files documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_reusable-prompts)
- [VS Code Copilot customization guide](https://code.visualstudio.com/docs/copilot/copilot-customization)
