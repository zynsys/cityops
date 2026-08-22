# Real-World AI Development with GitHub Copilot

Welcome to this full-day hands-on workshop on **GitHub Copilot**! In this session, you'll go far beyond autocomplete — exploring the full spectrum of Copilot features using **CityOps**, a real production-grade civic reporting platform.

## Workshop Overview

This workshop is different from most. Instead of a toy project built for the occasion, you'll be working with **CityOps** — a fully featured, multi-tenant civic reporting SaaS platform with real architectural complexity: multi-tenant isolation, RBAC, geospatial queries, AI validation, authentication, and more.

Every exercise uses real code, real specs, and real problems. By the end of the day you'll have experienced the full Copilot workflow — from understanding an unfamiliar codebase to deploying features through autonomous agents.

### Learning Objectives

By the end of this workshop, you will be able to:

1. **Understand an unfamiliar codebase** — Use Copilot Ask mode to navigate a real full-stack application
2. **Configure custom instructions** — Set up repository and task-level instruction files to guide code generation
3. **Work with Copilot CLI** — Use Copilot directly from the terminal to explore and modify code
4. **Use Inline Chat and Edit Mode** — Make targeted, context-aware edits inside VS Code
5. **Create prompt files** — Build reusable `.prompt.md` files for recurring development tasks
6. **Use Plan Mode** — Let Copilot plan a feature before writing a single line of code
7. **Generate a feature end-to-end** — Drive a full implementation (migration → API → UI) from a spec in Agent Mode
8. **Connect MCP servers** — Extend Copilot with GitHub MCP and PostgreSQL MCP for database-aware code generation
9. **Build agent skills** — Create reusable SKILL.md definitions with CityOps domain knowledge
10. **Create custom agents** — Build specialised agents for RBAC review, database migrations, and more
11. **Generate tests** — Produce unit and integration tests for real application code
12. **Apply Copilot Vision** — Convert screenshots and wireframes into working UI components
13. **Use Copilot Coding Agent** — Assign a GitHub Issue and let Copilot implement a full feature end-to-end
14. **Run background agents** — Offload long-running tasks to cloud and background Copilot agents
15. **Orchestrate agentic workflows** — Chain multi-step tasks across the full stack in a single agent session
16. **Run multi-agent development** — Coordinate parallel agents working on different layers simultaneously
17. **Use agent hooks** — Automate lint, security checks, and context injection with Copilot lifecycle hooks
18. **Review code and security** — Use Copilot to identify security gaps and generate PR descriptions

## The Project: CityOps

Throughout this workshop, you'll be working with **CityOps** — a national civic reporting and city operations platform. Citizens report public issues anywhere in the UK, and the responsible council is automatically detected from the pin location.

### Tech Stack

| Layer        | Technology                    |
| ------------ | ----------------------------- |
| Frontend     | Next.js 16 / React 19         |
| Styling      | Tailwind CSS v4 + ShadCN UI   |
| Database     | PostgreSQL + PostGIS (Docker) |
| ORM          | Prisma                        |
| Auth         | Auth.js (NextAuth v5)         |
| AI           | Azure OpenAI (gpt-4o vision)  |
| Email        | Mailpit                       |
| File Storage | Azure Blob Storage            |
| CI/CD        | GitHub Actions                |

### Key Architectural Concepts

Understanding these will help you get more from the exercises:

- **Multi-tenancy** — Every council is a separate tenant. Staff only see their council's data. All queries in staff context must include a `tenant_id` clause.
- **RBAC** — Four roles: Citizen, Authority User, Tenant Admin, Platform Admin. Enforced in middleware and at the query layer.
- **Report lifecycle** — `Created → Under Validation → Validated → Assigned → In Progress → Resolved → Closed`
- **AI validation** — Uploaded images are checked for relevance by Azure OpenAI gpt-4o. Results are auditable and overridable.
- **Geospatial tenant detection** — When a citizen drops a pin, PostGIS `ST_Within` determines the responsible council from boundary data.

## Prerequisites

Before attending this workshop, please ensure you have:

- [ ] A GitHub account with an active **Copilot Pro, Pro+, Business, or Enterprise** subscription
- [ ] **VS Code** with the GitHub Copilot extension installed
- [ ] **Node.js 20+** and **Git** installed and configured
- [ ] **Docker Desktop** — for PostgreSQL (with PostGIS) and Mailpit email testing
- [ ] An **Azure account** — free tier at [azure.microsoft.com/free](https://azure.microsoft.com/free)
- [ ] An **Azure OpenAI** resource with a vision-capable model deployed (e.g. `gpt-4o`)
- [ ] Basic familiarity with TypeScript and SQL

> [!NOTE]
> If you are using Copilot Business or Copilot Enterprise, ensure your admin has enabled Copilot CLI and agent features for your organisation.

> [!TIP]
> You can complete most exercises without Azure OpenAI — the AI validation feature will gracefully skip if the environment variables are not set. However, Module 06 and beyond work best with it configured.

## Workshop Modules

### Foundation

| Module                              | Topic     | Description                                                            |
| ----------------------------------- | --------- | ---------------------------------------------------------------------- |
| [00. Workshop Overview][m00]        | Overview  | Workshop goals, the CityOps project, and key architectural concepts    |
| [01. Prerequisites][m01]            | Setup     | Repo setup, Codespace or local, seed the database, run the app         |
| [02. App Walkthrough][m02]          | Hands-on  | Register, verify email, submit a report, staff review — full lifecycle |
| [03. Understanding a Codebase][m03] | Reference | Architecture overview: schema, RBAC, middleware, module boundaries     |

### Developer Productivity

| Module                             | Topic      | Description                                                               |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------- |
| [04. Inline Chat & Edit Mode][m04] | Edit Mode  | Fix a real bug with Inline Chat; refactor a component with Edit Mode      |
| [05. Ask Mode][m05]                | Ask Mode   | Multi-file context, `#file` anchoring, follow-up chains, RBAC exploration |
| [06. Plan Mode][m06]               | Plan Mode  | Draft a structured implementation plan with the Plan Agent before coding  |
| [07. Agent Mode][m07]              | Agent Mode | Implement a real spec end-to-end: migration, API route, and UI component  |
| [08. Copilot Vision][m08]          | Vision     | Attach screenshots and wireframes; implement UI from visual context       |

### Extending Copilot in VS Code

| Module                         | Topic       | Description                                                                         |
| ------------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| [09. Custom Instructions][m09] | Context     | Explore and extend instruction files; see their impact on generated code            |
| [10. Prompt Files][m10]        | Reusability | Create `.prompt.md` files for scaffolding API routes and status transitions         |
| [11. Custom Agents][m11]       | Agents      | Build a `rbac-reviewer` or `db-migration` agent with CityOps domain knowledge       |
| [12. Agent Skills][m12]        | Skills      | Explore SKILL.md format; create a `report-workflow` skill for CityOps               |
| [13. MCP Servers][m13]         | MCP         | Connect GitHub MCP and PostgreSQL MCP for database-aware, issue-linked code changes |
| [14. Awesome Copilot][m14]     | Community   | Browse, evaluate, and import community instruction files from Awesome Copilot       |

### Copilot CLI

| Module                            | Topic | Description                                                                |
| --------------------------------- | ----- | -------------------------------------------------------------------------- |
| [15. CLI Installation][m15]       | CLI   | Install GitHub CLI, add the Copilot extension, authenticate                |
| [16. Commonly Used Commands][m16] | CLI   | `explain`, `suggest`, and `gh copilot chat` with real CityOps files        |
| [17. CLI + MCP Servers][m17]      | CLI   | Use GitHub and PostgreSQL MCP servers from terminal sessions               |
| [18. CLI + Agent Skills][m18]     | CLI   | Load SKILL.md files in terminal sessions; combine with MCP for max context |

### Testing with Copilot

| Module                                | Topic      | Description                                                            |
| ------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| [19. Unit Testing with Copilot][m19]  | Quality    | Generate unit and integration tests for auth middleware and API routes |
| [20. UI Testing with Playwright][m20] | UI Testing | Generate Playwright end-to-end tests for citizen and staff workflows   |
| [21. Security Review][m21]            | Security   | Identify auth and tenant isolation gaps using Copilot Code Review      |

### Spec Driven Development

| Module                              | Topic | Description                                                               |
| ----------------------------------- | ----- | ------------------------------------------------------------------------- |
| [22. Speckit Installation][m22]     | SDD   | Install Speckit, understand SDD, set up the specs directory               |
| [23. Generating a Spec][m23]        | SDD   | Write a feature requirement and generate a structured spec with Speckit   |
| [24. Implementation from Spec][m24] | SDD   | Implement a feature from the spec in Agent Mode, then validate the output |

### Agentic Development

| Module                              | Topic        | Description                                                                |
| ----------------------------------- | ------------ | -------------------------------------------------------------------------- |
| [25. Copilot Coding Agent][m25]     | Coding Agent | Assign a real GitHub Issue; review the feature PR Copilot produces         |
| [26. PR Descriptions & Review][m26] | PRs          | Auto-generate PR descriptions; use Copilot review on a real diff           |
| [27. Background Agents][m27]        | Background   | Offload long-running tasks to cloud and background Copilot agents          |
| [28. Agentic Workflows][m28]        | Workflows    | Chain migration → API route → UI → seed data in a single agent session     |
| [29. Multi-Agent Development][m29]  | Multi-Agent  | Run parallel agents on migration, API, and UI; coordinate the merge        |
| [30. Agent Hooks][m30]              | Hooks        | Automate lint, security checks, and context injection with lifecycle hooks |

## Tips for Success

1. **Explore before you edit** — Always ask Copilot to explain a file or module before making changes
2. **Be specific with context** — Reference actual file names, function names, and CityOps domain concepts in your prompts
3. **Use instruction files** — The existing `.github/copilot-instructions.md` and `.github/instructions/` files are there to guide Copilot — read them first
4. **Trust but verify** — Always review generated code, especially around RBAC and tenant isolation
5. **Iterate** — Copilot is non-deterministic; refine prompts and follow up when results miss the mark
6. **Keyboard shortcuts** — Use `←` / `→` arrow keys to navigate between modules in the step viewer

## Support

- **During the workshop**: Raise your hand or ask in the event chat
- **After the workshop**: Open an issue in the [workshop repository](https://github.com/zynsys/cityops)

---

_Happy coding! 🚀_

[m00]: ./foundation/01-workshop-overview.md
[m01]: ./foundation/02-prereqs.md
[m02]: ./foundation/03-project-walkthrough.md
[m03]: ./foundation/04-understanding-codebase.md
[m04]: ./developer-productivity/01-inline-chat.md
[m05]: ./developer-productivity/02-ask-mode.md
[m06]: ./developer-productivity/03-plan-mode.md
[m07]: ./developer-productivity/04-agent-mode.md
[m08]: ./developer-productivity/05-approval-types.md
[m09]: ./extending-copilot/01-custom-instructions.md
[m10]: ./extending-copilot/02-prompt-files.md
[m11]: ./extending-copilot/03-custom-agents.md
[m12]: ./extending-copilot/04-agent-skills.md
[m13]: ./extending-copilot/05-mcp-servers.md
[m14]: ./extending-copilot/06-awesome-copilot.md
[m15]: ./copilot-cli/01-installation.md
[m16]: ./copilot-cli/02-commands.md
[m17]: ./copilot-cli/03-mcp-integration.md
[m18]: ./copilot-cli/04-skills-integration.md
[m19]: ./testing/01-unit-testing.md
[m20]: ./testing/02-ui-testing-playwright.md
[m21]: ./testing/03-security-review.md
[m22]: ./spec-driven-development/01-speckit-installation.md
[m23]: ./spec-driven-development/02-generating-spec.md
[m24]: ./spec-driven-development/03-implementation.md
[m25]: ./agentic-development/01-coding-agent.md
[m26]: ./agentic-development/02-pr-review.md
[m27]: ./agentic-development/03-background-agents.md
[m28]: ./agentic-development/04-agentic-workflows.md
[m29]: ./agentic-development/05-multi-agent.md
[m30]: ./agentic-development/06-agent-hooks.md
