# Module 15 — Copilot CLI: Integration with MCP Servers

> **Topic**: Copilot CLI | **Time**: 15 min

MCP (Model Context Protocol) servers extend what Copilot can access. In VS Code you configure them via `settings.json` — and that same configuration is available to `gh copilot chat`, giving your terminal sessions live access to GitHub Issues, your PostgreSQL schema, and more.

## What You'll Learn

- How MCP server configuration is shared between VS Code and Copilot CLI
- How to use the GitHub MCP server from the terminal
- How to use the PostgreSQL MCP server from the terminal to query CityOps data

## Step 1 — Verify Your MCP Config is Active

MCP servers configured in VS Code's `settings.json` under `"github.copilot.modelContext.servers"` are automatically available in `gh copilot chat`. Check your current config:

```bash
cat ~/.vscode/settings.json | grep -A 20 "modelContext"
# or for project-level config:
cat .vscode/settings.json | grep -A 20 "modelContext"
```

If you completed Module 11 (MCP Servers), your GitHub and PostgreSQL MCP servers should already be configured.

## Exercise 1 — GitHub MCP from the Terminal

Start a chat session and use GitHub MCP to pull issue context into your terminal workflow:

```bash
gh copilot chat
```

```
List the open GitHub issues for this repository. Which ones relate to the report lifecycle?
```

```
Show me the details of issue #<number>. What changes would be needed in the CityOps codebase to implement it?
```

```
Find any issues labelled "bug" and summarise what files are likely involved based on the description.
```

> [!TIP]
> This is powerful for triage workflows — you can go from "what issues exist?" to "which files need changing?" without leaving the terminal.

## Exercise 2 — PostgreSQL MCP from the Terminal

With the PostgreSQL MCP server active, ask questions about the live CityOps database:

```bash
gh copilot chat
```

```
How many reports are in each status in the database right now?
```

```
Which tenants have the most reports? Show me the top 5.
```

```
Are there any reports assigned to a user who no longer exists in the users table?
```

## Exercise 3 — Combine Both: Issue → Code → Database

Chain GitHub and PostgreSQL context in one session:

```
Look at GitHub issue #<number>. Based on the current database schema, what Prisma migration would be needed to implement it? Draft the migration SQL.
```

## Summary

MCP configuration is shared — set it up once in VS Code and it works in `gh copilot chat` too. This makes terminal sessions as context-rich as your IDE sessions.
