# Exercise 02 — Custom Instructions

Context is everything when working with AI. In this module you'll explore how CityOps uses instruction files to give Copilot project-specific knowledge — then extend them with new standards and observe the difference in generated code.

## Learning Objectives

- Understand the difference between `.github/copilot-instructions.md` and `.instructions.md` files
- Explore the existing instruction files in the CityOps repository
- Add a new coding standard and observe how it changes code generation
- Create a new task-specific instruction file

## Background

CityOps ships with a set of instruction files that teach Copilot the project's conventions:

| File                                     | Purpose                                             |
| ---------------------------------------- | --------------------------------------------------- |
| `.github/copilot-instructions.md`        | Project-wide context sent with every prompt         |
| `.github/instructions/*.instructions.md` | Task-specific guidance applied by file path pattern |

These files are the reason Copilot generates code that fits CityOps — not generic boilerplate.

## Exercise 1 — Explore the Existing Instructions

1. Open `.github/copilot-instructions.md`
2. Read through it — note the sections covering:
   - Project overview and tech stack
   - Coding standards (TypeScript strict mode, no `any`, server components by default)
   - Tailwind CSS v4 rules (CSS-based config, no `tailwind.config.ts`)
   - File organisation conventions

3. Open `.github/instructions/` and browse the files inside
4. Open Copilot Chat and ask:

```
What instruction files exist in this repository? Summarise what each one covers and which file patterns they apply to.
```

## Exercise 2 — See Instructions in Action

1. Open a new Copilot Chat session (type `/clear`)
2. Open `src/app/reports/page.tsx` to set context
3. Send this prompt:

```
Add a "Reported By" column to the reports list that shows the submitter's display name.
```

4. Observe the generated code — it should:
   - Use TypeScript with proper types (no `any`)
   - Use a Server Component (no `'use client'` unless necessary)
   - Follow the existing Tailwind CSS v4 patterns
   - Use the existing Prisma client from `src/lib/prisma.ts`

5. Expand the **References** section in the chat — confirm that `copilot-instructions.md` was included

> [!NOTE]
> Do not apply these changes — this exercise is about observation, not implementation.

## Exercise 3 — Add a New Coding Standard

The team has decided that all new utility functions must include a JSDoc comment. Let's add this standard and observe its impact.

1. Open `.github/copilot-instructions.md`
2. Find the TypeScript coding standards section and add:

```markdown
- All utility functions must include a JSDoc comment describing their purpose, parameters, and return value
```

3. Save the file
4. Open a new Copilot Chat session (`/clear`)
5. Ask the same prompt as Exercise 2 again
6. Note whether the generated code now includes JSDoc comments on utility functions

## Exercise 4 — Create a Task-Specific Instruction File

CityOps has a pattern for Prisma queries: always scope to `tenantId`, never return internal fields to the client. Let's create an instruction file that codifies this.

1. Create a new file at `.github/instructions/prisma-queries.instructions.md`
2. Open Copilot Chat and ask it to generate the instruction file:

```
Create a .instructions.md file for Prisma queries in CityOps. It should cover:
- Always including tenantId in WHERE clauses for staff-context queries
- Never returning is_internal comments to non-staff users
- Using select to explicitly choose fields rather than returning full objects
- Using the prisma singleton from src/lib/prisma.ts

Apply it to files matching: src/app/api/**/*.ts and src/actions/**/*.ts
```

3. Review the generated content, adjust as needed, and save it
4. Open a new chat session and test it by asking:

```
Create an API route that returns all reports for the current tenant, filtered by status.
```

5. Verify the generated code includes `tenantId` in the query and uses explicit field selection

## Summary

You've explored how CityOps uses instruction files to guide Copilot, extended the project-wide instructions with a new standard, and created a task-specific instruction file for Prisma queries.

Key takeaways:

- `copilot-instructions.md` sets project-wide context — keep it focused on things relevant to most prompts
- `.instructions.md` files apply when Copilot works on files matching the `applyTo` pattern
- Instruction files need to be specific and use examples — vague instructions produce vague results
- Run `/clear` between tests to start a fresh session

## Resources

- [Custom instructions for GitHub Copilot](https://code.visualstudio.com/docs/copilot/copilot-customization)
- [Awesome Copilot — instruction file templates](https://github.com/github/awesome-copilot)
- [Best practices for custom instructions](https://github.blog/ai-and-ml/github-copilot/5-tips-for-writing-better-custom-instructions-for-copilot/)
