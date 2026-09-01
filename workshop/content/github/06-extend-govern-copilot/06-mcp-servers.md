# Exercise 08 — MCP Servers

Model Context Protocol (MCP) servers extend Copilot with real-time access to external tools and data. In this module you'll connect the GitHub MCP and PostgreSQL MCP servers and use them together to drive a database-aware, issue-linked code change.

## Learning Objectives

- Understand what MCP servers are and how they extend Copilot
- Configure the GitHub MCP and PostgreSQL MCP servers in VS Code
- Query live GitHub issues and database schema from within Copilot Chat
- Use MCP context to make a more accurate code change

## Background

MCP servers expose tools that Copilot can call during a chat session. Examples:

| MCP Server         | Tools it provides                                             |
| ------------------ | ------------------------------------------------------------- |
| **GitHub MCP**     | List issues, read PRs, search code, create branches           |
| **PostgreSQL MCP** | Query database schema, list tables, run SQL, describe columns |
| **Playwright MCP** | Browser automation, screenshots, accessibility testing        |

## Step 1 — Configure MCP Servers in VS Code

MCP servers are configured in `.vscode/mcp.json` (workspace) or your VS Code user settings.

1. Create `.vscode/mcp.json` in the CityOps repo root:

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "postgres": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://postgres:postgres@localhost:5432/cityops"]
    }
  }
}
```

2. Ensure the CityOps Docker database container is running (`docker ps | grep cityops-db`)
3. Reload VS Code — the MCP servers will start automatically

> [!NOTE]
> The GitHub MCP server uses your existing `gh auth` token — no additional configuration needed. The PostgreSQL MCP server connects directly to the local Docker container started in Module 00.

## Exercise 1 — Explore GitHub MCP

1. Open Copilot Chat in Agent mode
2. Ask Copilot to list open issues:

```
Using the GitHub MCP, list the open issues in this repository. Group them by label if any exist.
```

3. Ask about a specific issue:

```
Find any GitHub issues related to report filtering or search. What are they asking for?
```

4. Ask Copilot to summarise recent activity:

```
What are the last 5 commits in this repository? Summarise what changed in each one.
```

> [!TIP]
> Notice how Copilot calls the GitHub MCP tool and shows you the raw result before synthesising an answer. You can see exactly what data it's working from.

## Exercise 2 — Explore PostgreSQL MCP

1. With PostgreSQL MCP connected, ask:

```
Using the PostgreSQL MCP, describe the schema of the cityops database. List all tables and their column counts.
```

2. Ask about specific tables:

```
Describe the Report table in detail — list every column, its type, whether it's nullable, and any foreign key relationships.
```

3. Run a live query:

```
How many reports are in each status? Show me a breakdown using a SQL query against the live database.
```

4. Check for data quality:

```
Are there any reports with a null tenantId? Run a query to check.
```

## Exercise 3 — Combine Both MCP Servers

The real power of MCP is combining multiple servers. Find a GitHub issue and implement the fix using live database schema awareness.

1. Ask Copilot:

```
Find a GitHub issue about filtering or sorting reports. Then, using the PostgreSQL MCP to look at the actual database schema, suggest the most efficient implementation approach — including which indexes might be needed.
```

2. Once you have a plan, ask Copilot to implement it:

```
Implement the filter you described. Use the actual column names from the Neon schema description, not guesses. Create a Prisma query that filters reports by [the field from the issue], scoped to the current tenant.
```

3. Compare this approach to Module 06 — the code Copilot generates should be more accurate because it has seen the real column names, types, and nullable constraints from the live database.

## Exercise 4 — Create a GitHub Issue from Copilot

1. Ask Copilot:

```
Using the GitHub MCP, create a new issue titled "Add sorting to the reports list page" with a description that covers the current state, the desired behaviour, and acceptance criteria based on what you know about the CityOps reports list.
```

2. Review the created issue in GitHub — does it contain useful, accurate information about the codebase?

## Summary

You've connected two MCP servers and used them together to query live GitHub data and a real database schema from within Copilot Chat. The code Copilot generated was grounded in actual data — not guesses.

Key takeaways:

- MCP servers give Copilot real-time access to external systems
- Combining multiple MCP servers lets Copilot reason across systems (e.g. "find the issue, read the schema, write the fix")
- The generated code is more accurate when Copilot can see real column names and types
- Tools are called transparently — you can always see what Copilot queried

## Resources

- [MCP documentation](https://modelcontextprotocol.io)
- [GitHub MCP server](https://github.com/github/github-mcp-server)
- [Neon MCP server](https://github.com/neondatabase/mcp-server-neon)
- [VS Code MCP configuration](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
