# Exercise 17 — Agent Hooks

Agent hooks let you execute shell commands at specific points in an agent session lifecycle — before a tool runs, after a file is edited, when a session starts, or when it ends. In this module you'll create hooks that enforce CityOps quality standards automatically, without relying on the agent to remember them.

## Learning Objectives

- Understand the hook lifecycle events available in VS Code
- Create a `PostToolUse` hook that runs ESLint after every file edit
- Create a `PreToolUse` hook that blocks destructive terminal commands
- Create a `SessionStart` hook that injects branch and environment context
- Observe how hooks interact with agent behaviour in practice

## Background

Hooks are configured in `.github/hooks/*.json` and loaded automatically by VS Code. They fire at deterministic lifecycle points regardless of what the agent was prompted to do.

| Event          | When it fires                       | Common uses                                |
| -------------- | ----------------------------------- | ------------------------------------------ |
| `SessionStart` | First prompt of a new session       | Inject project state, validate environment |
| `PreToolUse`   | Before any tool call                | Block dangerous commands, require approval |
| `PostToolUse`  | After a tool completes successfully | Run formatters, linters, tests             |
| `Stop`         | Agent session ends                  | Run full test suite, generate reports      |

> [!NOTE]
> Agent hooks are a Preview feature. Ensure you have VS Code 1.107+ and the GitHub Copilot extension up to date.

## Step 1 — Create the Hooks Directory

```bash
mkdir -p .github/hooks
```

## Exercise 1 — Auto-Lint After File Edits

Create `.github/hooks/quality.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "npx eslint \"$TOOL_INPUT_FILE_PATH\" --max-warnings 0 --no-eslintrc -c eslint.config.mjs 2>&1 | head -20",
        "timeout": 30
      }
    ]
  }
}
```

Test it:

1. Open an agent session and ask it to edit any TypeScript file with a deliberate style issue
2. Watch the **GitHub Copilot Chat Hooks** output channel — the lint command will fire after the edit
3. If lint errors are found, the output is fed back to the agent as `additionalContext`

> [!TIP]
> To view hook output: open the Output panel → select **GitHub Copilot Chat Hooks** from the channel dropdown.

## Exercise 2 — Block Destructive Terminal Commands

Create `.github/hooks/safety.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "type": "command",
        "command": "node -e \"const input = require('fs').readFileSync('/dev/stdin','utf8'); const d = JSON.parse(input); const cmd = d.tool_input?.command || ''; const dangerous = ['DROP TABLE','DROP DATABASE','rm -rf','DELETE FROM','TRUNCATE']; const hit = dangerous.find(p => cmd.toUpperCase().includes(p)); if (hit) { console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'Blocked by CityOps safety hook: ' + hit}})); process.exit(0); } process.exit(0);\"",
        "timeout": 5
      }
    ]
  }
}
```

Test it:

1. In an agent session, ask: `Run this SQL: DROP TABLE "Report" CASCADE`
2. The hook should intercept the terminal tool call and return a deny decision
3. The agent will see the block reason and should propose a safer alternative

> [!IMPORTANT]
> The hook script reads tool input from stdin as JSON. The `tool_input.command` field contains the terminal command the agent wants to run. If you're adapting this for your own project, log the raw stdin first to understand the exact JSON shape.

## Exercise 3 — Inject Session Context at Start

Create a `SessionStart` hook that tells every new agent session what branch it's on and what database is connected:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "node -e \"const branch = require('child_process').execSync('git branch --show-current').toString().trim(); const db = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown' : 'not configured'; console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:'CityOps session context — Branch: ' + branch + ' | Database: ' + db + ' | Run npm run build before committing.'}}));\"",
        "timeout": 10
      }
    ]
  }
}
```

Add this to `.github/hooks/context.json` and start a new agent session.

The agent's first response should acknowledge the injected context. Ask it:

```
What branch are we on and what database is connected?
```

It should answer correctly from the injected context without reading any files.

## Exercise 4 — Hook Scoped to a Custom Agent

You can also attach hooks directly to a custom agent definition. Open `.github/agents/rbac-reviewer.agent.md` (from Module 10) and add a `Stop` hook that runs after every RBAC review session:

```yaml
---
name: rbac-reviewer
description: Reviews code for RBAC and tenant isolation correctness
hooks:
  Stop:
    - type: command
      command: echo "RBAC review session complete. Check output above for CRITICAL and HIGH findings." >&2
---
```

This fires when the rbac-reviewer agent session ends, reminding the user to act on findings.

## Summary

You've created hooks that enforce quality gates automatically at every agent lifecycle event — without relying on prompts or agent memory.

Key takeaways:

- **Hooks are deterministic** — Unlike instructions, hooks execute code with guaranteed results
- **Use `PreToolUse` to block, `PostToolUse` to validate** — This covers the full tool execution cycle
- **`SessionStart` is great for context injection** — Saves repeating environment details in every session
- **Hooks compose with custom agents** — Agent-scoped hooks only run when that agent is active

## Resources

- [Agent hooks in VS Code](https://code.visualstudio.com/docs/copilot/customization/hooks)
- [Hook lifecycle events reference](https://code.visualstudio.com/docs/copilot/customization/hooks#_hook-lifecycle-events)
