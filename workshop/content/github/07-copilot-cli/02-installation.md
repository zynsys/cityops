# Module 13 — Copilot CLI: Installation

> **Topic**: Copilot CLI | **Time**: 10 min

GitHub Copilot CLI brings AI assistance directly to your terminal. This module gets you installed and authenticated so you're ready for the exercises that follow.

## Step 1 — Install GitHub CLI

Copilot CLI is an extension of the GitHub CLI (`gh`). Install it if you don't already have it:

```bash
# macOS
brew install gh

# Windows (winget)
winget install GitHub.cli

# Windows (Chocolatey)
choco install gh
```

Verify installation:

```bash
gh --version
```

## Step 2 — Authenticate with GitHub

```bash
gh auth login
```

Follow the prompts — select **GitHub.com**, **HTTPS**, and authenticate via browser. Use the account that has your Copilot subscription.

## Step 3 — Install the Copilot CLI Extension

```bash
gh extension install github/gh-copilot
```

Verify:

```bash
gh copilot --version
```

## Summary

You now have GitHub Copilot CLI installed and authenticated. The next three modules cover how to use it effectively.

> [!TIP]
> Copilot CLI reads the same `.github/copilot-instructions.md` and `.instructions.md` files as VS Code — your custom instructions apply here too.

GitHub Copilot CLI brings AI assistance directly to your terminal. In this module you'll install it, authenticate, and use it to explore and understand the CityOps codebase from the command line.

## Learning Objectives

- Install and authenticate GitHub Copilot CLI
- Use `gh copilot explain` to understand complex code from the terminal
- Use `gh copilot suggest` to generate shell commands
- Use agent mode from the terminal to explore the codebase

## Step 1 — Install GitHub CLI

Copilot CLI is an extension of the GitHub CLI (`gh`). If you don't have it installed:

```bash
# macOS
brew install gh

# Windows (winget)
winget install GitHub.cli

# Windows (Chocolatey)
choco install gh
```

Verify installation:

```bash
gh --version
```

## Step 2 — Authenticate with GitHub

```bash
gh auth login
```

Follow the prompts — select **GitHub.com**, **HTTPS**, and authenticate via browser. Make sure you authenticate with the account that has your Copilot subscription.

## Step 3 — Install the Copilot CLI Extension

```bash
gh extension install github/gh-copilot
```

Verify:

```bash
gh copilot --version
```

## Exercise 1 — Explain Code from the Terminal

1. Navigate to the CityOps repo root:

```bash
cd /path/to/cityops
```

2. Use `explain` to understand the Prisma client setup:

```bash
gh copilot explain "$(cat src/lib/prisma.ts)"
```

3. Ask about the middleware:

```bash
gh copilot explain "$(cat middleware.ts)"
```

4. Try explaining a complex type:

```bash
gh copilot explain "$(cat src/types/index.ts)"
```

> [!TIP]
> `explain` is particularly useful for understanding unfamiliar code patterns, regex, or complex TypeScript generics.

## Exercise 2 — Suggest Shell Commands

Use `suggest` to get help with commands you're not sure about:

1. Ask for help with Prisma:

```bash
gh copilot suggest "show me all pending migrations"
```

2. Ask for a database-related command:

```bash
gh copilot suggest "reset the database and reseed it"
```

3. Ask about the project:

```bash
gh copilot suggest "find all TypeScript files that import from src/lib/prisma"
```

> [!NOTE]
> `suggest` is designed for shell commands — use it when you know what you want to accomplish but not the exact command syntax.

## Exercise 3 — Use Copilot CLI in Agent Mode

Copilot CLI's most powerful feature is agent mode, which can explore the codebase, run commands, and make changes.

1. Start a Copilot CLI session:

```bash
gh copilot chat
```

2. Ask it to explore the project structure:

```
What is the folder structure of this project? Explain what each key directory contains.
```

3. Ask about a specific feature:

```
How does password reset work in this application? Trace it from the API route to the email being sent.
```

4. Ask about the report lifecycle:

```
Find all the places in the codebase where a report's status is changed. What triggers each transition?
```

5. Ask a practical question:

```
Which API routes are not protected by authentication middleware? List them with their file paths.
```

## Exercise 4 — Explore with Context

Pipe file contents into Copilot for targeted analysis:

```bash
# Understand the schema enums
grep -A 20 "^enum " prisma/schema.prisma | gh copilot explain

# Check what environment variables are used
grep -r "process.env" src/lib/ | gh copilot explain "What environment variables does this application require and what are they used for?"
```

## Summary

You've installed and used GitHub Copilot CLI for code explanation, command suggestion, and agentic exploration of the CityOps codebase from the terminal.

Key takeaways:

- `explain` is your "what does this do?" command — great for understanding unfamiliar code
- `suggest` is your "how do I do this?" command — great for shell command syntax
- Agent mode (`gh copilot chat`) has full codebase access and can reason across multiple files
- Copilot CLI reads the same `.github/copilot-instructions.md` and `.instructions.md` files as VS Code

## Resources

- [GitHub Copilot CLI documentation](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line)
- [GitHub CLI installation](https://cli.github.com/)
