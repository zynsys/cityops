# Spec Driven Development — Speckit Installation

> **Topic**: Spec Driven Development | **Time**: 10 min

Spec Driven Development (SDD) flips the usual workflow: you write a precise human-readable specification first, then use Copilot to validate and implement it. **Speckit** is a VS Code extension that generates structured specs from natural language requirements and wires them into your agent workflows.

## Learning Objectives

- Understand what Spec Driven Development is and why it matters
- Install and configure the Speckit VS Code extension
- Verify the installation is working

## What is Spec Driven Development?

In traditional development, requirements live in tickets and the code becomes the implicit spec. In SDD:

1. **Write the spec first** — a structured, human-readable document that defines acceptance criteria, data shapes, API contracts, and edge cases
2. **Implement against the spec** — ask Copilot to implement exactly what the spec describes
3. **Validate against the spec** — ask Copilot to audit the implementation against the spec
4. **Iterate** — gaps in the spec are explicit, not buried in code

The spec becomes the single source of truth. Copilot becomes the implementation engine.

## Why Speckit?

Writing a good spec by hand takes discipline. Speckit accelerates the process by:

- Generating structured spec documents from natural language requirements
- Adding acceptance criteria, data model changes, API contracts, and edge cases automatically
- Integrating directly with Copilot Agent Mode via `#file` references

## Step 1 — Install Speckit

Install from the VS Code marketplace:

1. Open the Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for **Speckit**
3. Click **Install** and reload VS Code

Alternatively, install via CLI:

```bash
code --install-extension speckit.speckit
```

## Step 2 — Verify the Installation

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **Speckit** — you should see the Speckit commands listed:
   - `Speckit: Generate Spec from Selection`
   - `Speckit: Validate Implementation`
   - `Speckit: Open Spec Panel`

If the commands appear, Speckit is installed and ready.

## Step 3 — Create the Specs Directory

Create a directory in the project for specs:

```bash
mkdir -p docs/specs
```

This is where all spec files will live. Adding them under `docs/` means they're version-controlled alongside the code and accessible to Copilot via `#file` references.

## Summary

You now have Speckit installed and the project structure ready for spec-driven development. In the next module you'll write a feature requirement and use Speckit to generate a full structured spec from it.
