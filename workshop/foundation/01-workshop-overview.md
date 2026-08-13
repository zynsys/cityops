# Workshop Overview

Welcome to **Real-World AI Development with GitHub Copilot**! This workshop takes you well beyond autocomplete — exploring the full spectrum of Copilot features applied to **CityOps**, a real production-grade civic reporting platform.

## What Makes This Workshop Different

Instead of a toy project built for the occasion, you'll be working with **CityOps** — a fully featured, multi-tenant civic reporting SaaS platform with genuine architectural complexity:

- Multi-tenant isolation
- Role-based access control (RBAC)
- Geospatial queries with PostGIS
- AI-powered image validation
- Authentication with Auth.js
- Report lifecycle management

Having a real codebase means you're practising Copilot in the same context you'd encounter at work — unfamiliar files, real conventions, and actual tradeoffs.

## Setting Expectations

A few things to keep in mind before you start:

- **The goal is Copilot proficiency, not feature delivery.** Each exercise is designed to practise a specific Copilot capability. You are not expected to implement a feature end-to-end in every module.
- **Most functionality already exists in the app.** Many exercises ask you to explore, explain, or make a small targeted edit to existing code. That _is_ the exercise.
- **Some modules introduce a small new feature as a vehicle.** For example, the Spec Driven Development module adds a simple Contact Me form — just enough to practise the workflow, not a production requirement.
- **Modules are independent.** You can do any module without having completed the others. Each module states its own minimal prerequisites (usually just: repo cloned, app running). No exercise requires a result produced in a previous one.
- **Pick the modules relevant to you.** If you're only here for Copilot CLI, go straight to that section. If you want the full day, follow the sequence.

## Learning Objectives

By the end of this workshop, you will be able to:

1. **Understand an unfamiliar codebase** — Use Copilot Ask mode to navigate a real full-stack application
2. **Configure custom instructions** — Set up repository and task-level instruction files to guide code generation
3. **Work with Copilot CLI** — Use Copilot directly from the terminal to explore and modify code
4. **Use Inline Chat and Edit Mode** — Make targeted, context-aware edits inside VS Code
5. **Create prompt files** — Build reusable `.prompt.md` files for recurring development tasks
6. **Use Plan Mode** — Let Copilot plan a feature before writing a single line of code
7. **Drive a feature from a spec** — Use Agent Mode to implement a change end-to-end from a structured spec
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

## Tips for Success

1. **Explore before you edit** — Always ask Copilot to explain a file or module before making changes
2. **Be specific with context** — Reference actual file names, function names, and CityOps domain concepts in your prompts
3. **Use instruction files** — The existing `.github/copilot-instructions.md` and `.github/instructions/` files are there to guide Copilot — read them first
4. **Trust but verify** — Always review generated code, especially around RBAC and tenant isolation
5. **Iterate** — Copilot is non-deterministic; refine prompts and follow up when results miss the mark
6. **Don't chase completion** — If a generated feature isn't perfect, that's fine. The learning is in the process, not the output
7. **Keyboard shortcuts** — Use `←` / `→` arrow keys to navigate between modules in the step viewer
