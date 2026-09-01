# Exercise 11 — Copilot Coding Agent

Copilot Coding Agent is a fully autonomous AI developer. You assign it a GitHub Issue, it explores the codebase, writes code, runs tests, and raises a Pull Request — without you writing a single line. In this module you'll assign a real CityOps issue and review the resulting PR.

## Learning Objectives

- Assign a GitHub Issue to Copilot Coding Agent
- Understand what Copilot Coding Agent can and cannot handle
- Review an AI-generated Pull Request critically
- Provide feedback and request iterations on the PR

## Prerequisites

- Your fork of CityOps must be on GitHub (public or with Copilot enabled for the organisation)
- Copilot Coding Agent must be enabled for your GitHub account or organisation

## Step 1 — Find or Create a Suitable Issue

Copilot Coding Agent works best on issues that are:

- Self-contained (don't require external credentials or services to implement)
- Well-specified (clear acceptance criteria)
- Moderate in scope (a new feature or bug fix, not a full refactor)

1. Go to your CityOps fork on GitHub
2. Open the **Issues** tab
3. Look for an existing issue labelled `good first issue` or `enhancement`

If no suitable issues exist, create one. Here's a good example:

**Title**: Add "last updated" timestamp to report cards on the homepage

**Description**:

```
Currently, report cards on the homepage only show the `createdAt` date.

## Acceptance Criteria
- Report cards on the homepage (src/components/reports/ReportCard.tsx or similar) show a "last updated" timestamp
- The timestamp displays as a relative time (e.g. "2 hours ago") using an existing or new date utility
- The timestamp is only shown if `updatedAt` differs from `createdAt`
- The change is a Server Component — no client-side JavaScript required for the display
- Follow Tailwind CSS v4 conventions (no tailwind.config.ts)
```

## Step 2 — Assign the Issue to Copilot

1. Open the issue on GitHub
2. In the right sidebar, under **Assignees**, click the gear icon
3. Select **Copilot** from the dropdown
4. Alternatively, leave a comment on the issue:

```
@github-copilot please implement this
```

5. Watch the issue — Copilot will start a session and explore the codebase

> [!NOTE]
> Copilot Coding Agent reads your `.github/copilot-instructions.md` and `.instructions.md` files. The quality of your instructions directly affects the quality of the PR.

## Step 3 — Monitor the Session

1. Click the **View session** link that appears on the issue
2. Watch Copilot's exploration steps:
   - It reads the codebase structure
   - It finds relevant files (the report card component, date utilities, etc.)
   - It makes code changes
   - It runs linting/type checking if configured

3. Observe what files it explores — does it find the right places?

## Step 4 — Review the Pull Request

When Copilot opens the PR:

1. Read the PR description — Copilot generates a description of what it changed and why
2. Open the **Files changed** tab
3. Review each change critically:

**Check for:**

- [ ] Correct TypeScript types (no `any`)
- [ ] Server Component (no `'use client'` added unnecessarily)
- [ ] Tailwind CSS v4 patterns (no inline styles, no `tailwind.config.ts`)
- [ ] The `updatedAt !== createdAt` check is implemented
- [ ] The date is formatted correctly (relative time)
- [ ] No new Prisma queries added at the component level (data should come from the page)

**Common issues to look for:**

- Copilot adding `'use client'` when it's not needed (just for date formatting)
- Using a client-side `Date` comparison instead of comparing server-side
- Hardcoded strings instead of using the existing i18n or formatting patterns

## Step 5 — Request Changes

If the PR needs changes:

1. Leave a review comment on the specific line:

```
This adds 'use client' unnecessarily. The date formatting can be done server-side using Intl.RelativeTimeFormat. Please rewrite this as a pure Server Component.
```

2. Submit a **Request changes** review
3. Copilot will respond to your comments and push new commits to the same PR

## Step 6 — Merge or Continue Iterating

Once the PR looks good:

1. Approve the PR
2. Merge it into your branch
3. Pull the changes locally and verify the feature works

```bash
git pull origin main
npm run dev
```

## Summary

You've experienced the full Copilot Coding Agent workflow — from issue creation to PR review and merge. The agent followed your custom instructions, explored the right files, and produced a PR that implements the feature.

Key takeaways:

- Issue quality determines PR quality — clear acceptance criteria produce better code
- Your instruction files are read by the coding agent — they're even more valuable than you thought
- Always review AI-generated PRs as carefully as you'd review a human's PR
- Use inline review comments to request changes — Copilot responds to them just like a developer would

## Resources

- [Copilot Coding Agent documentation](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-coding-agent)
- [Writing effective issues for Copilot](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-coding-agent#writing-effective-issues)
