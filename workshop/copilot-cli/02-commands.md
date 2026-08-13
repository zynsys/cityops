# Module 14 — Copilot CLI: Commonly Used Commands

> **Topic**: Copilot CLI | **Time**: 20 min

With Copilot CLI installed, this module covers the two most-used commands — `explain` and `suggest` — and `gh copilot chat` for interactive terminal sessions. All exercises use real CityOps files.

## The Three Core Commands

| Command              | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `gh copilot explain` | Explain what a piece of code or output does               |
| `gh copilot suggest` | Get a shell command for a task described in plain English |
| `gh copilot chat`    | Start an interactive AI session in the terminal           |

## Exercise 1 — `explain`: Understand Code from the Terminal

Use `explain` to understand CityOps modules without opening VS Code:

```bash
# Explain the Prisma client setup
gh copilot explain "$(cat src/lib/prisma.ts)"

# Explain the auth middleware
gh copilot explain "$(cat middleware.ts)"
```

Pipe grep output for targeted questions:

```bash
# What environment variables does the app need?
grep -r "process.env" src/lib/ | gh copilot explain "What environment variables does this application require?"

# What do the Prisma schema enums represent?
grep -A 20 "^enum " prisma/schema.prisma | gh copilot explain
```

> [!TIP]
> `explain` is best for unfamiliar code, complex TypeScript generics, regex patterns, or long Prisma queries.

## Exercise 2 — `suggest`: Get Shell Commands

Use `suggest` when you know _what_ you want but not the exact command:

```bash
# Prisma workflow
gh copilot suggest "show me all pending migrations"
gh copilot suggest "reset the database and reseed it"

# File search
gh copilot suggest "find all TypeScript files that import from src/lib/prisma"

# Git
gh copilot suggest "show me all files changed in the last 3 commits"
```

Copilot will propose a shell command and ask whether to run it, copy it, or revise it.

## Exercise 3 — `gh copilot chat`: Interactive Sessions

Start an interactive Copilot session in the terminal:

```bash
gh copilot chat
```

Try these questions against the CityOps repo:

```
What is the folder structure of this project? Explain what each key directory contains.
```

```
How does password reset work? Trace it from the API route to the email being sent.
```

```
Find all the places where a report's status is changed. What triggers each transition?
```

```
Which API routes are not protected by authentication middleware? List them with file paths.
```

## Summary

- `explain` — "what does this do?" — pipe any file or command output into it
- `suggest` — "how do I do this?" — describes the task, gets a runnable command
- `gh copilot chat` — interactive session with full codebase context

## Resources

- [GitHub Copilot CLI documentation](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line)
