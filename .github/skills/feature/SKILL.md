---
name: feature
description: Manage current feature workflow - load, plan, implement, test or complete
argument-hint: load|plan|implement|test|complete
---

# Feature Workflow

Manages the full lifecycle of a feature from spec to merge.

## Working Files

- `@context/current-feature.md` - Active feature state
- `@context/HISTORY.md` - Append-only summaries of completed features, oldest to newest

### Current Feature File Structure

current-feature.md has these sections:

- `# Current Feature` - H1 heading with feature name when active
- `## Status` - Not Started | Planned | In Progress | Complete
- `## Goals` - Bullet points of what success looks like
- `## Notes` - Additional context, constraints, or details from spec
- `## References` - Links or references to related materials
- `## Plan` - Ordered, file-specific implementation steps and validation checks

## Task

Execute the requested action: $ARGUMENTS

| Action | Description |
|--------|-------------|
| `load` | Load a feature spec or inline description |
| `plan` | Analyze the feature and write a strict implementation plan |
| `implement` | Create the branch and execute the approved plan |
| `test` | Test the implementation and verify goals, plan, and scope |
| `complete` | Commit, push, merge, reset |

See [actions/](actions/) for detailed instructions.

If no action provided, explain the available options.