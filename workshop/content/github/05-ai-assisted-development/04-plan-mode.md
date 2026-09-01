# Plan Mode

> **Tool**: GitHub Copilot — Plan Mode in VS Code | **Time**: 20 min

## Scenario

In the previous module you used Inline Chat to make targeted, single-file edits. That works well for small changes. For a feature that involves a schema migration, new API logic, and UI changes across multiple files, jumping straight into edits risks making the wrong thing in the wrong order.

Plan Mode adds a reasoning step before any files are touched. Copilot reads your codebase, identifies constraints, drafts an implementation plan, and lets you refine it — before writing a single line of code. When you're happy, one click hands the approved plan off to Agent Mode for implementation.

## Prerequisites

- CityOps repository open in VS Code
- GitHub Copilot extension installed and signed in
- Previous modules completed

---

## Opening Plan Mode

1. Open Copilot Chat with **Ctrl+Alt+I**
2. Click the mode dropdown at the bottom of the panel and select **Plan**

| What Plan Mode does                           | What it does NOT do                 |
| --------------------------------------------- | ----------------------------------- |
| Reads your codebase to understand constraints | Edit any files                      |
| Asks clarifying questions to fill in gaps     | Assume — it will ask instead        |
| Produces a step-by-step implementation plan   | Start coding until you approve      |
| Supports multiple refinement passes           | Lock you in — you can revise freely |

---

## Activity — Plan the SLA Tracking Feature

CityOps has no way for councils to know when a report is overdue. You'll use Plan Mode to design an **SLA Tracking** feature: each report category gets a response time, and the staff list flags reports that have passed it.

This is a good fit for Plan Mode — it touches the Prisma schema, report creation logic, a database query, and the staff UI.

### Step 1 — Start with a broad prompt

1. In Plan mode, type:

   ```text
   I want to add SLA tracking to CityOps. Each report category should have a response time, and the staff reports list should flag overdue reports.
   ```

2. Wait for Copilot to generate its first plan. It will read `prisma/schema.prisma` and the relevant source files, then produce a structured plan with the files it intends to change

3. If Copilot asks clarifying questions, answer them — for example it may ask where `dueAt` should be set, or whether SLA should be per-tenant or platform-wide

> [!TIP]
> Start broad — you can always add constraints in follow-up prompts. Don't try to front-load every detail into the first message.

### Step 2 — Refine the plan

Once you have a first plan, guide it with follow-up prompts. Here are some useful ones:

```text
The slaHours field should be optional — not all categories need a deadline.
```

```text
The "Overdue" indicator should appear on the staff reports list as a small badge next to the status, only when dueAt is in the past and the report is not resolved or closed.
```

```text
What value should dueAt have for reports created before SLA tracking was introduced?
```

Each reply updates the plan in place. Keep refining until the plan lists the files to change, the order of changes, and has no open questions you're unsure about.

> [!NOTE]
> Changing the plan is free. Changing code after a migration has been applied is not. Spend the time here.

### Step 3 — Hand off to Agent Mode

When you're satisfied with the plan, you have two options at the bottom of the plan:

**Option A — Start immediately**

1. Click the **Start implementation** button

   This switches Copilot from Plan to Agent Mode automatically, with the approved plan as its context.

2. Watch Agent Mode work through the plan step by step — schema first, then application logic, then UI
3. Review each file change as it lands

**Option B — Save the plan first**

1. Click **Open in editor**

   This creates a `.prompt.md` file in your workspace containing the full plan text. You can edit it, share it, or commit it as a spec.

2. When ready to implement, open Copilot Chat in Agent Mode and attach the saved file as context

> [!TIP]
> If you need to resume in a new session, use **Open in editor** to save the plan first. Copilot doesn't retain memory between sessions — the saved file becomes your handoff document.

---

## Summary

You've used Plan Mode to design a real feature before writing any code — starting broad, refining through follow-up questions, and handing off a complete plan to Agent Mode.

- **Start broad** — Copilot will ask what it needs to know
- **Refine until there are no open questions** — the plan is the spec
- **Click Start implementation** to hand off — Agent Mode receives the full plan as context

In the next module you'll use **Agent Mode** to implement a feature end-to-end from a clear starting prompt.
