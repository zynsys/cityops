# Exercise 08 — Agent Skills

Agent skills are reusable, domain-specific capabilities packaged in `SKILL.md` files. CityOps already ships with two skills — in this module you'll explore them, understand the format, and create a new skill that captures report workflow domain knowledge.

## Learning Objectives

- Understand the `SKILL.md` file format and when skills are invoked
- Explore the existing CityOps skills (`feature` and `cleanup`)
- Create a new `report-workflow` skill with CityOps-specific domain knowledge
- Invoke a skill and observe how it shapes the agent's behaviour

## Background

A skill is a `SKILL.md` file placed in `.github/skills/<skill-name>/`. When an agent is told to use a skill (or discovers it via the skills folder), it reads the SKILL.md to understand:

- What the skill does
- When to use it
- Step-by-step instructions for the agent to follow
- References to relevant files or patterns

## Exercise 1 — Explore Existing Skills

1. Open `.github/skills/feature/SKILL.md`
2. Read through it — note:
   - How it describes what the skill does
   - The step-by-step workflow it defines
   - Any references to other files in the project

3. Open `.github/skills/cleanup/SKILL.md` and compare the structure
4. Ask Copilot:

```
Read the skill files in .github/skills/. Explain what each skill does and give me an example of when I would invoke each one.
```

## Exercise 2 — Invoke an Existing Skill

1. Open Copilot Chat in Agent mode
2. Invoke the `feature` skill:

```
@workspace /feature start - I want to add a "bulk status update" feature that lets Authority Users select multiple reports and change their status at once
```

3. Observe how the agent follows the skill's workflow — it reads the current feature state, explores relevant specs, and sets up a plan
4. Note the difference between this and a plain agent prompt — the skill provides a structured, repeatable workflow

## Exercise 3 — Create a `report-workflow` Skill

You'll create a skill that gives any agent deep knowledge of the CityOps report lifecycle — useful for any task that touches status transitions, assignments, or lifecycle validation.

1. Create the directory:

```bash
mkdir -p .github/skills/report-workflow
```

2. Open Copilot Chat in Agent mode and ask it to generate the skill:

```
Create a SKILL.md file for a "report-workflow" skill for the CityOps project. This skill should:

1. Explain the full report lifecycle: Created → Under Validation → Validated/Invalid → Assigned → In Progress → Resolved → Closed
2. Document which roles can trigger each transition
3. List the business rules that must be checked before any status change (tenantId scoping, role verification, etc.)
4. Reference the relevant files: prisma/schema.prisma (ReportStatus enum), src/lib/ (any transition logic), middleware.ts (role enforcement)
5. Provide step-by-step instructions for an agent to safely implement any new status transition

Save the output to .github/skills/report-workflow/SKILL.md
```

3. Review the generated SKILL.md — does it accurately reflect the report lifecycle from `prisma/schema.prisma`?
4. Correct any inaccuracies — open the schema and verify each status and role against the generated content

## Exercise 4 — Test the New Skill

1. Open a new Copilot Chat session
2. Invoke the new skill:

```
Use the report-workflow skill to help me implement a new transition: allowing a Tenant Admin to re-open a Closed report back to Validated status. What changes are needed and what rules must be checked?
```

3. Compare the response to asking the same question without invoking the skill:

```
How would I allow a Tenant Admin to re-open a closed report?
```

4. Note the difference — the skill-guided response should reference specific files, specific business rules, and follow the exact workflow the skill defines

## Exercise 5 — Improve the Skill Based on Results

Skills improve through iteration. Based on what you observed:

1. Identify any gaps in the skill's instructions
2. Open the SKILL.md and ask Copilot to improve it:

```
I used this skill to implement a status transition and noticed it didn't mention that the audit log must always be updated when a status changes. Add that requirement to the skill's workflow steps.
```

## Summary

You've explored the existing CityOps skills, invoked one to start a feature workflow, and created a new `report-workflow` skill that packages domain knowledge about the report lifecycle for use in any agent session.

Key takeaways:

- Skills are "expertise packages" — they teach agents domain-specific workflows and rules
- Well-written skills reference actual files so agents can find implementation examples
- Invoke skills explicitly in your prompts to get structured, domain-aware responses
- Skills improve iteratively — treat them like living documentation

## Resources

- [Agent skills documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_agent-skills)
- [Awesome Copilot — skill examples](https://github.com/github/awesome-copilot)
