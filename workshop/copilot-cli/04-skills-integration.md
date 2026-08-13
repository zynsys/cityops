# Module 16 — Copilot CLI: Integration with Agent Skills

> **Topic**: Copilot CLI | **Time**: 15 min

Agent Skills (`SKILL.md` files) define domain knowledge packages that Copilot can load during a session. In VS Code you invoke them from the model picker — in `gh copilot chat` you load them by referencing the skill file directly. This module shows you how to use your CityOps skills from the terminal.

## What You'll Learn

- How to load a SKILL.md file in a `gh copilot chat` session
- How skills improve the quality of terminal-based code generation
- How to use the `report-workflow` skill you created in Module 11

## Step 1 — Review Your Available Skills

```bash
ls .github/skills/
```

You should see skills from Module 11, for example:

- `report-workflow/SKILL.md`
- `rbac-reviewer/SKILL.md`

## Exercise 1 — Load a Skill in a Chat Session

Reference a skill file when starting or during a chat:

```bash
gh copilot chat
```

```
Read the skill file at .github/skills/report-workflow/SKILL.md and apply it for the rest of this session. Confirm what you've loaded.
```

Then ask a domain-specific question that benefits from the skill:

```
Using the report workflow knowledge, what API changes would be needed to add an "escalated" status between "validated" and "assigned"?
```

Compare the answer quality to the same question without loading the skill first.

## Exercise 2 — Use the RBAC Reviewer Skill from the Terminal

```bash
gh copilot chat
```

```
Read .github/skills/rbac-reviewer/SKILL.md and apply it. Then review the file src/app/api/reports/route.ts — does it correctly enforce tenant isolation and role-based access?
```

```
Based on the RBAC rules in the skill, are there any query files under src/db/queries/ that are missing tenant_id filters?
```

## Exercise 3 — Combine a Skill with MCP Context

Load a skill and use an MCP server together in one session:

```
Load .github/skills/report-workflow/SKILL.md. Then, using the live database via the PostgreSQL MCP server, find any reports that are in a status that shouldn't be reachable according to the workflow rules.
```

## Summary

Skills in the terminal work the same as in VS Code: you provide the SKILL.md content as context and Copilot applies the domain knowledge to every subsequent answer in the session.

| Combination        | Capability                             |
| ------------------ | -------------------------------------- |
| CLI + Skills       | Domain-aware answers in the terminal   |
| CLI + MCP          | Live data access in the terminal       |
| CLI + Skills + MCP | Domain rules applied against live data |
