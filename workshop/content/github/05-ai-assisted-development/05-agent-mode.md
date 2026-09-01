# Agent Mode

> **Tool**: GitHub Copilot — Agent Mode in VS Code | **Time**: 20 min

## Scenario

In the previous module you used Plan Mode to design the SLA tracking feature without writing any code. Agent Mode is where that plan becomes working code. You give it a goal — Copilot reads the codebase, decides which files to change, makes the edits, and runs the build to check its own work.

The feature you'll implement: **citizen-facing comment submission on public report pages**. The `ReportComment` model and the comment display component already exist. There is no way for a logged-in citizen to post a comment — you'll add that.

## Prerequisites

- CityOps repository open in VS Code
- GitHub Copilot extension installed and signed in
- Previous modules completed

---

## Opening Agent Mode

1. Open Copilot Chat with **Ctrl+Alt+I**
2. Click the mode dropdown at the bottom of the panel and select **Agent**

| What Agent Mode does                          | What it does NOT do                     |
| --------------------------------------------- | --------------------------------------- |
| Reads the codebase to find relevant files     | Wait for you to point at specific files |
| Creates and edits files across the workspace  | Make changes outside the workspace      |
| Runs terminal commands (e.g. `npm run build`) | Deploy or push code                     |
| Iterates on its own output when errors occur  | Loop forever — it will stop and ask     |

---

## Activity — Implement Citizen Comment Submission

### Step 1 — Give the agent context upfront

Agent Mode works best when you orient it before the main task. Send this first:

```text
Before I give you a task, read these files so you understand the patterns to follow:
- src/app/api/staff/reports/[id]/comments/route.ts
- src/components/reports/ReportComments.tsx
- src/app/(public)/reports/[id]/page.tsx
- src/lib/session.ts
```

Wait for Copilot to confirm it has read them.

> [!TIP]
> This reduces the chance of Copilot inventing a pattern that differs from what already exists in the codebase.

### Step 2 — Send the task

```text
Add citizen comment submission to the public report detail page. A logged-in citizen should be able to post a comment on any report. Follow the patterns in the files you just read and the conventions in .github/copilot-instructions.md.
```

Watch Copilot outline which files it will create or change before it starts editing. If the plan looks wrong, tell it before it proceeds.

### Step 3 — Iterate with follow-up prompts

Agent Mode retains context within the session. Use short follow-ups to correct or extend:

```text
The tenantId in the POST handler must come from the session, not the request body.
```

```text
After a successful submission, refresh the comment list using router.refresh() from next/navigation.
```

```text
The submit button should be disabled and show "Posting..." while the request is in flight.
```

> [!TIP]
> Short, specific follow-ups work better than re-stating the full task. The agent knows what it built.

### Step 4 — Verify the build

Once the edits are done:

1. Check that Copilot ran `npm run build` automatically — if not, ask it to
2. If there are TypeScript errors, use Inline Chat (`Ctrl+I` → `/fix`) on the affected lines
3. Run `npm run dev` and sign in as a citizen user (credentials in `prisma/seed.ts`) to test manually

---

## Summary

You've used Agent Mode to implement a multi-file feature — API route, client component, and page integration — by giving Copilot a goal and letting it navigate the codebase.

- **Orient with context first** — point it at existing patterns before the main task
- **Watch the plan before it edits** — it's the last cheap checkpoint
- **Follow up with short, targeted prompts** — don't re-run the full task to make corrections
- **Always verify the build** — Agent Mode can miss type constraints it didn't read

In the next module you'll use **Copilot Vision** — working from screenshots and UI mockups.
