# Exercise 09 — Custom Agents

Custom agents are specialised Copilot assistants with a defined persona, a specific set of tools, and domain knowledge baked in. In this module you'll explore the existing CityOps agents and build two new ones — a RBAC reviewer and a database migration assistant.

## Learning Objectives

- Understand the `.agent.md` file format
- Explore the existing agents in the CityOps repository
- Create a `rbac-reviewer` agent specific to CityOps tenant isolation rules
- Create a `db-migration` agent that follows CityOps Prisma conventions
- Invoke custom agents and observe how their persona shapes responses

## Background

A custom agent is defined by a `.agent.md` file in `.github/agents/` or `.vscode/`. When you `@mention` the agent in chat, Copilot adopts its persona, tools, and instructions for the session.

## Exercise 1 — Explore Existing Agents

1. Open `.github/agents/code-scanner.agent.md`
2. Note the structure:
   - Frontmatter with `name`, `description`, `tools`
   - A system prompt that defines the agent's persona and responsibilities
   - Specific instructions and constraints

3. Open `.github/agents/ui-reviewer.md` and compare
4. Ask Copilot:

```
Read the agent files in .github/agents/. Explain what each agent does, when I would use it, and what makes it different from just asking regular Copilot Chat.
```

## Exercise 2 — Invoke the Code Scanner Agent

1. Open Copilot Chat
2. Mention the code scanner agent:

```
@code-scanner scan src/app/api/ for security issues
```

3. Observe how the agent:
   - Adopts the code scanner persona
   - Focuses specifically on security rather than general code quality
   - Applies its own rules and checklist

## Exercise 3 — Create the `rbac-reviewer` Agent

CityOps has a complex RBAC model with tenant isolation. You'll create an agent that specialises in reviewing code for RBAC correctness.

1. Create `.github/agents/rbac-reviewer.agent.md`
2. Ask Copilot to generate it:

```
Create a custom agent file for CityOps called "rbac-reviewer". This agent:

- Is an expert in the CityOps RBAC model (four roles: Citizen, AuthorityUser, TenantAdmin, PlatformAdmin)
- Reviews code specifically for tenant isolation violations — queries that don't scope to tenantId
- Checks that all API routes call getRequiredSession() and verify the correct role
- Ensures internal comments (is_internal = true) are never returned to non-staff users
- Checks that Prisma queries in staff context always include a tenantId WHERE clause
- Reports issues as: CRITICAL (data leak), HIGH (auth bypass), MEDIUM (missing check), INFO (suggestion)

Give it access to the codebase files tool. Reference src/lib/session.ts and middleware.ts as the authoritative sources for auth patterns.

Save to .github/agents/rbac-reviewer.agent.md
```

3. Review the generated file — verify the RBAC rules are accurate against your actual codebase
4. Correct any inaccuracies (e.g. if the role names don't match the Prisma enum exactly)

## Exercise 4 — Test the RBAC Reviewer

1. Open Copilot Chat
2. Invoke the new agent:

```
@rbac-reviewer review src/app/api/reports/route.ts for RBAC compliance
```

3. Ask it to review a broader area:

```
@rbac-reviewer scan all API routes in src/app/api/ that handle report data. List any that are missing tenant scoping or role verification.
```

4. Compare the output to what you'd get from regular Copilot — the specialised agent should be more precise and consistent in what it checks.

## Exercise 5 — Create the `db-migration` Agent

Database migrations are high-risk in a multi-tenant system. You'll create an agent that knows the CityOps schema conventions and guides safe migrations.

1. Create `.github/agents/db-migration.agent.md`
2. Ask Copilot to generate it:

```
Create a custom agent called "db-migration" for the CityOps project. This agent:

- Is an expert in Prisma migrations for CityOps
- Knows the schema conventions: all models have a UUID id, all tenant-scoped models have tenantId, timestamps use createdAt/updatedAt
- Before suggesting a migration, it checks the existing schema in prisma/schema.prisma
- It warns if a proposed change would break existing queries (e.g. renaming a column)
- It always suggests running migrations on a non-production branch first (using Neon branching)
- It provides the exact Prisma commands to run: db:migrate:create, db:migrate:deploy
- It generates seed data updates when new required fields are added

Save to .github/agents/db-migration.agent.md
```

3. Test it:

```
@db-migration I want to add an optional "severity" field to the Report model with values: low, medium, high, critical. Walk me through the safest way to do this.
```

4. Note how the agent checks the existing schema, warns about impacts, and provides concrete migration steps

## Summary

You've explored existing agents, created two domain-specific custom agents, and tested them against real CityOps code. Custom agents are powerful because they apply specialised, consistent knowledge on demand.

Key takeaways:

- Custom agents are "specialists" — create one per recurring concern (security, migrations, testing, etc.)
- The agent's system prompt is the key — be specific about what it checks and how it reports findings
- Reference actual files in the agent definition so it knows where to look
- Agents compound with skills and instruction files — a well-configured repository has all three layers

## Resources

- [Custom agents documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_custom-chat-modes)
- [Agent file format reference](https://code.visualstudio.com/docs/copilot/copilot-customization)
