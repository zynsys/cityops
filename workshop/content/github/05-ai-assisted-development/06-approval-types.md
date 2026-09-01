# Approval Types

> **Tool**: GitHub Copilot — Agent Mode Approval Settings | **Time**: 15 min

## Scenario

In the previous module you ran Agent Mode with the default settings — Copilot paused before each tool call (reading a file, running a command, writing code) and waited for your approval. That's safe for learning, but it can slow you down once you trust what the agent is doing.

Approval Types let you control exactly how much autonomy Copilot has during an Agent Mode session. Choosing the right level for the task at hand is one of the most practical things you can tune as you get comfortable with Agent Mode.

## Prerequisites

- CityOps repository open in VS Code
- GitHub Copilot extension installed and signed in
- Previous modules completed

---

## The Three Approval Types

Click the shield icon next to the mode dropdown in the Copilot Chat panel to open the approval settings.

| Approval Type         | Behaviour                                                                 | Best for                                     |
| --------------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| **Default Approvals** | Copilot uses your configured VS Code settings — prompts before tool calls | Learning Agent Mode, unfamiliar codebases    |
| **Bypass Approvals**  | All tool calls are auto-approved, no interruptions                        | Trusted tasks on code you know well          |
| **Autopilot**         | Fully autonomous — iterates from start to finish without stopping         | Well-scoped tasks with a clear, safe outcome |

> [!IMPORTANT]
> Autopilot is a preview feature. It will run terminal commands and write files without asking. Only use it when you are confident the task is well-scoped and you can review the diff before merging.

---

## Activity — Try Each Approval Type

### Step 1 — Observe Default Approvals

1. Make sure the mode dropdown shows **Agent** and the shield icon shows **Default Approvals**
2. Send a small task:

   ```text
   Add a comment to the top of src/lib/utils.ts explaining what the file exports.
   ```

3. Notice how Copilot pauses and asks before reading the file and before writing the change — every tool call is gated

### Step 2 — Try Bypass Approvals

1. Click the shield icon and switch to **Bypass Approvals**
2. Send the same kind of task:

   ```text
   Add a comment to the top of src/lib/rewards.ts explaining what the file exports.
   ```

3. Notice Copilot reads and writes without pausing — the same work happens, just without interruptions

> [!TIP]
> Bypass Approvals is the mode most developers settle on for day-to-day Agent Mode work. You still see every change in the diff before accepting it.

### Step 3 — Explore Autopilot

1. Click the shield icon and switch to **Autopilot (Preview)**
2. Send a task with a clear, verifiable done state:

   ```text
   Run npm run build and fix any TypeScript errors you find.
   ```

3. Watch Copilot run the build, read the error output, locate the affected files, make the fixes, and re-run the build — all without stopping

> [!NOTE]
> Autopilot works best when the task has a built-in completion signal (build passes, tests pass) so the agent can verify its own work. Open-ended tasks with no clear done state can cause it to loop.

---

## Summary

Approval Types let you dial the level of autonomy to match your confidence in the task.

- **Default Approvals** — maximum visibility, approve each tool call; use when learning or in unfamiliar code
- **Bypass Approvals** — no interruptions, full diff review at the end; the right setting for most day-to-day tasks
- **Autopilot** — fully autonomous end-to-end; use for well-scoped tasks with a verifiable done state

In the next module you'll explore **Custom Instructions** — teaching Copilot your project's conventions so every mode follows them automatically.
