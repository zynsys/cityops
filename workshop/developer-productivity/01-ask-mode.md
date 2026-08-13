# Ask Mode

> **Tool**: GitHub Copilot Chat — Ask Mode in VS Code | **Time**: 25 min

## Scenario

In the previous module you explored the CityOps codebase manually — reading files, tracing flows, connecting the dots between models, middleware, and queries. It took a while.

Now you'll do the same kind of exploration using **GitHub Copilot Ask Mode**. Ask Mode is Copilot's conversational interface in VS Code: you ask questions, Copilot answers using your actual code as context. No code changes — just understanding.

By the end of this module you'll have answers to the same questions from the previous module, in a fraction of the time.

## Prerequisites

- CityOps repository open in VS Code
- GitHub Copilot extension installed and signed in
- No files need to be running — this is a read-only exploration exercise

---

## Opening Copilot Chat in Ask Mode

1. Open Copilot Chat with **Ctrl+Alt+I** (or click the Copilot icon in the Activity Bar)
2. At the bottom of the chat panel, make sure the mode dropdown shows **Ask** — if it shows Agent or Edit, click it and switch to Ask

   > [!NOTE]
   > Ask Mode is for questions and exploration only — it will not edit any files. That's intentional here. The other modes (Inline Chat, Edit, Agent) are covered in the modules that follow.

3. Start a fresh session by typing `/clear` and pressing **Enter**

---

## Copilot Chat Syntax

The prompts in this module use two pieces of special syntax. Before you start, here's what they mean:

| Syntax               | What it is             | What it does                                                                                                                                                                                                                                          |
| -------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@workspace`         | A **chat participant** | Scopes the conversation to your entire project. Copilot searches across all files — `package.json`, source files, config, Prisma schema — to build context for its answer. Use it for cross-cutting questions where the answer might span many files. |
| `#file:path/to/file` | A **context variable** | Attaches a specific file to the prompt. Copilot reads that file's contents as part of the question. Use it when your question is about a specific file — you'll get more precise, line-referenced answers than with `@workspace`.                     |

> [!TIP]
> You can also just **open a file in the editor** without using `#file:` — Copilot will reference the active editor automatically for many questions. But `#file:` is explicit and works even if you have a different file in focus.

---

## Exercise 1 — Understand the Project Structure

Start broad, then zoom in.

1. Send this prompt:

   ```text
   @workspace Give me a high-level tour of this codebase. What kind of application is this, what is the tech stack, and how is the src/ folder organised?
   ```

2. Read the response. Notice that Copilot finds the `package.json`, `prisma/schema.prisma`, and the `src/` folder structure to build its answer — you didn't have to point it anywhere.

3. Now zoom in on something specific:

   ```text
   @workspace What is the difference between the (public) and staff route groups in src/app/? Give me examples of what lives in each.
   ```

4. Follow up without re-typing any context:

   ```text
   Why would a developer put files inside a folder with parentheses in Next.js? What does that actually do?
   ```

   > [!TIP]
   > Copilot holds context within a session. Short follow-up questions work because it remembers what you were just discussing. This is much faster than searching documentation.

---

## Exercise 2 — Explore the Data Model

1. Open `prisma/schema.prisma` in VS Code (you don't need to read it — just open it so Copilot can reference it)

2. Ask:

   ```text
   #file:prisma/schema.prisma
   Explain the data model. What are the core entities, how are they related, and which tables enforce multi-tenancy?
   ```

3. Look at Copilot's response. Did it identify:
   - The `tenant_id` foreign key pattern across tables?
   - The `UserRole` join table for RBAC?
   - The `TenantBoundary` model and its PostGIS column?

4. Now ask a more targeted question:

   ```text
   #file:prisma/schema.prisma
   Does the User model have a role field? If not, where are user roles stored and why might it be designed that way?
   ```

5. Follow up:

   ```text
   #file:prisma/schema.prisma
   What is the full report lifecycle? List every status a report can have and describe what each one means.
   ```

6. Ask one more to understand the audit trail:

   ```text
   #file:prisma/schema.prisma
   How is the report lifecycle tracked historically? Is there a model that records every status change?
   ```

   > [!NOTE]
   > Compare how long this took vs reading the schema manually in the previous module. You're getting the same answers — with explanations — in a few seconds per question.

---

## Exercise 3 — Trace the Authentication Flow

1. Open `auth.config.ts` in the editor

2. Ask:

   ```text
   #file:auth.config.ts
   What does this file do? Walk me through the JWT and session callbacks — what extra fields are being added to the token and why?
   ```

3. Now open `middleware.ts` alongside it and ask:

   ```text
   #file:middleware.ts
   Explain this middleware. Which routes are public, which are role-restricted, and what happens at each decision point when a request comes in?
   ```

4. Ask a specific scenario question:

   ```text
   #file:middleware.ts
   What exactly happens if a citizen user navigates directly to /staff/reports? Trace the exact code path.
   ```

5. Open `src/lib/session.ts` and ask:

   ```text
   #file:src/lib/session.ts
   This file imports 'server-only' at the top. What does that package do and why is it important in a Next.js app?
   ```

   > [!TIP]
   > Opening the relevant file before asking anchors Copilot's answer to that specific file's contents. You'll get more precise, line-referenced answers than with a general `@workspace` question.

---

## Exercise 4 — Understand RBAC at Every Layer

This is where the real value of Ask Mode shows. You're going to trace RBAC enforcement across three different layers with chained questions.

1. Ask the first question:

   ```text
   @workspace How is role-based access control enforced in CityOps? Don't just describe the roles — tell me at which layers in the codebase access is actually checked.
   ```

2. Drill into the query layer:

   ```text
   @workspace Show me an example of a query function in src/db/queries/staff/ that scopes data to a specific tenant. How does it receive and use the tenantId?
   ```

3. Ask about the risk:

   ```text
   @workspace What would happen if a developer forgot to include the tenantId filter in a staff query? Is there any automated guard against that, or is it purely a convention?
   ```

4. Ask about the mutation layer:

   ```text
   @workspace How does a Server Action verify that the logged-in user has permission to update a report? Walk me through the pattern.
   ```

   > [!IMPORTANT]
   > Notice Copilot's answer to step 3 — it should confirm this is enforced by **convention**, not by a database-level constraint. This is a real architectural decision documented in `.github/copilot-instructions.md`. Ask Mode surfaces this kind of architectural nuance that you'd otherwise only find by reading the docs.

---

## Exercise 5 — Understand the Report Submission Flow

Use Ask Mode to trace a user action end-to-end across multiple files — something that would take a long time to do manually.

1. Ask:

   ```text
   @workspace When a citizen submits a new report using the wizard at /reports/new, what happens step by step on the server? Walk me through from form submission to the report appearing in the database.
   ```

2. Focus on the geospatial piece:

   ```text
   @workspace How does the app automatically detect which council is responsible for a report when the citizen drops a pin on the map? What kind of database query is used?
   ```

3. Ask about the AI validation:

   ```text
   @workspace What happens to the uploaded photo after a report is submitted? Is Azure OpenAI always called, or is there a fallback?
   ```

---

## Exercise 6 — Ask About the `.github/` Folder

1. Open `.github/copilot-instructions.md` in the editor and ask:

   ```text
   #file:.github/copilot-instructions.md
   Summarise the key rules this file sets for code generation. What would happen if a developer asked Copilot to add a new staff query without reading this file first?
   ```

2. Ask about one specific concern:

   ```text
   #file:.github/copilot-instructions.md
   What does this file say about multi-tenancy? Why would that be in a Copilot instructions file rather than just in code comments?
   ```

   > [!TIP]
   > This is a good moment to internalise something: **the instructions file shapes how Copilot behaves when it generates code for this repo**. The better it is, the better the generated code. You'll create and improve instruction files in the **Custom Instructions** module.

---

## Reflection

Look back at what just happened across these 6 exercises. You:

- Got a full architectural overview of a production codebase in under a minute
- Understood the data model — 24 models, 11 enums — by asking 4 targeted questions
- Traced the auth flow across 3 files in a single session
- Identified RBAC enforcement at every layer explicitly, including the architectural decision to use convention over database-level guards
- Traced a form submission end-to-end across the full stack
- Understood why the `.github/copilot-instructions.md` file exists and what it affects

All of this with zero file-reading, no grep, no following import chains manually.

Compare this to the **Understanding the Codebase** module. You covered similar ground, but here you got answers with explanations, file references, and follow-up capability — in a fraction of the time.

---

## Ask Mode — Key Techniques

| Technique                                 | When to use it                                         |
| ----------------------------------------- | ------------------------------------------------------ |
| `@workspace`                              | Cross-cutting questions about the whole project        |
| `#file:path/to/file.ts`                   | Questions about a specific file — more precise answers |
| Open file + ask                           | Copilot references the active editor automatically     |
| Short follow-up questions                 | Chain understanding — Copilot holds session context    |
| Scenario questions ("what happens if...") | Tracing code paths and edge cases                      |
| "At which layer is X enforced?"           | Architectural understanding                            |

---

## Summary

You've used Copilot Ask Mode to build a complete mental model of CityOps — the same mental model you built in the previous module by reading code manually, but faster and with richer explanations.

Ask Mode is not just for new joiners. It's the right tool whenever you need to:

- Understand an unfamiliar part of the codebase before changing it
- Verify how a pattern is implemented before repeating it
- Answer "why does this work this way?" questions quickly

In the next module you'll move from asking to **editing** — using Inline Chat and Edit Mode to make targeted, precise changes to the actual CityOps code.
