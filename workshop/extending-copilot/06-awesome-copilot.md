# Module 12 — Awesome Copilot

> **Topic**: Community Resources | **Time**: 15 min

[Awesome Copilot](https://github.com/github/awesome-copilot) is the official GitHub-curated collection of instruction files, prompt files, and agent definitions contributed by the community. This module shows you how to discover, evaluate, and adopt them in CityOps.

## What You'll Learn

- What the Awesome Copilot repository contains and how it's organised
- How to browse and import community instruction files
- How to use the `mcp_awesome-copil` MCP tool to load instructions from within Copilot
- How to evaluate whether a community file fits your codebase

## Step 1 — Browse the Repository

Open [https://github.com/github/awesome-copilot](https://github.com/github/awesome-copilot) and explore:

- **Instructions** — repository-level `.instructions.md` files grouped by language/framework
- **Prompts** — reusable `.prompt.md` files for common tasks
- **Collections** — curated bundles for specific stacks (e.g. Next.js, Prisma, TypeScript)

Identify 2–3 instruction files relevant to CityOps (TypeScript, Next.js, Prisma, security).

## Step 2 — Use the Awesome Copilot MCP Tool

If you have the Awesome Copilot MCP server configured, you can browse and load instructions directly from Copilot Chat:

```
List available instruction collections for TypeScript and Next.js projects.
```

```
Load the Next.js instruction collection and show me what it covers.
```

Review what the loaded instructions add — compare to the existing `.github/copilot-instructions.md` in CityOps.

## Step 3 — Import a Community Instruction File

Pick one relevant instruction file from the collection and add it to CityOps:

1. Copy the content into a new file under `.github/instructions/`
2. Set the `applyTo` glob pattern to target the right files
3. Ask Copilot to generate a small code change and observe whether the community instruction shapes the output

## Step 4 — Evaluate Fit

Not all community files suit every project. Ask Copilot to review a community instruction file against CityOps conventions:

```
#file:.github/copilot-instructions.md
#file:.github/instructions/<community-file>.instructions.md
Does the community file conflict with or duplicate anything in our existing instructions? What should we keep, modify, or discard?
```

## Summary

Awesome Copilot gives you a head-start on instruction files battle-tested by the community. The pattern: **browse → evaluate → import → test → trim**.

In the next module you'll use the **Copilot CLI** to extend Copilot to the terminal.
