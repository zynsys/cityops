# Exercise 14 — Background Agents

Background agents let you delegate a task and get on with other work while Copilot implements it independently. In this module you'll run two background agents simultaneously on different CityOps concerns, then review and apply each result.

## Learning Objectives

- Start a background agent session from the VS Code Chat panel
- Run two background agents in parallel on different tasks
- Review agent-produced file changes before applying them
- Understand when background agents are the right tool vs interactive agent sessions

## Background

VS Code supports three agent execution contexts:

| Context                 | Best for                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| **Local (interactive)** | Step-by-step work where you review each change before the agent proceeds |
| **Background**          | Delegated tasks you want to run while you work on something else         |
| **Cloud**               | Tasks that should produce a Pull Request (uses Copilot Coding Agent)     |

Background agents run in a separate session — they don't share context with your current chat. Each one gets a clean slate plus your workspace files and instruction files.

## Step 1 — Start a Background Agent

1. Open the Chat panel (`Ctrl+Alt+I`)
2. Click the **+** button → **New background agent**
3. A new session opens in the background — you can continue using the main chat while it runs
4. Monitor progress in the **Sessions** view (the list icon at the top of the Chat panel)

## Exercise 1 — Background Agent: Responsive Styles

The CityOps staff dashboard table is not optimised for narrow viewports. Start a background agent to fix it:

1. Start a new background agent
2. Send this prompt:

```
The staff reports table at src/components/staff/ is not mobile-responsive.

Add Tailwind CSS v4 responsive variants to:
- Stack the table into a card-per-row layout at screens below 768px
- Hide low-priority columns (e.g. internal ID, raw timestamps) on small screens
- Ensure the status badge and report title remain visible at all sizes

Do NOT add 'use client' — use only CSS responsive classes. Follow Tailwind CSS v4 conventions (no tailwind.config.ts).
```

3. Let it run in the background — move on to Exercise 2 now.

## Exercise 2 — Background Agent: Accessibility Pass (Parallel)

While the first agent works on responsive styles, start a second background agent for an accessibility improvement:

1. Start another new background agent
2. Send this prompt:

```
Review the CityOps public-facing report submission form at src/app/(public)/reports/ for accessibility issues.

Specifically:
- Ensure all form inputs have associated <label> elements
- Add aria-describedby for validation error messages
- Ensure the submit button has a meaningful aria-label when in a loading state
- Check that focus order is logical

Fix any issues you find. Use Tailwind CSS v4 only — no inline styles.
```

3. Both agents are now running in parallel. Check the Sessions view to monitor progress.

## Step 2 — Review and Apply Results

When each agent completes:

1. Open the Sessions view and select the completed session
2. Review the **file changes** summary before applying anything
3. For the responsive styles agent:
   - Does it use `md:` and `sm:` Tailwind variants correctly?
   - Has it avoided adding `'use client'`?
4. For the accessibility agent:
   - Are the `<label>` associations correct (matching `htmlFor` to input `id`)?
   - Are ARIA attributes used correctly?
5. Click **Apply** to bring changes into your working tree
6. Run `npm run build` to verify no errors were introduced

> [!TIP]
> If you disagree with part of a background agent's output, reject the full changeset and start a new background session with a more specific prompt. Background agents don't have a mid-session correction loop like interactive agents.

## Exercise 3 — Cloud Agent (Optional)

If your fork is on GitHub and Copilot Coding Agent is enabled, try delegating a task to the cloud instead of running it locally:

1. Click **+** → **New cloud agent**
2. Enter a task that is well-scoped and self-contained:

```
Add a "Copy link" button to each report card on the public homepage. Clicking it copies the direct URL to that report to the clipboard. Use the Clipboard API. The button should appear on hover only. Follow Tailwind CSS v4 and React conventions in the CityOps codebase.
```

3. The cloud agent will create a branch and open a PR
4. Review the PR on GitHub — compare with what a local agent would have produced

## Summary

You've run parallel background agents on independent concerns, reviewed their changes separately, and applied them. This is the pattern for polishing work — multiple concerns in parallel rather than one serial loop.

Key takeaways:

- **Background agents = async delegation** — Start them and do other work
- **Each session is isolated** — Background agents don't see your current chat context
- **Review before applying** — Treat the changeset like a PR, not an autocomplete suggestion

## Resources

- [Agent types and delegation in VS Code](https://code.visualstudio.com/docs/copilot/agents/overview)
- [Managing agent sessions](https://code.visualstudio.com/docs/copilot/chat/chat-sessions)
