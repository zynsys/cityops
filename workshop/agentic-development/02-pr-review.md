# Exercise 15 — PR Descriptions & Code Review

The last mile of any feature is getting it reviewed and merged. Copilot can help on both sides of that process — writing clear PR descriptions and reviewing incoming code. In this module you'll use Copilot to generate PR descriptions for work you've done today, and use Copilot's code review feature on a real diff.

## Learning Objectives

- Generate high-quality PR descriptions using Copilot
- Use Copilot code review on a real Pull Request
- Understand what Copilot catches well vs what still needs human review
- Request and respond to Copilot review suggestions

## Step 1 — Commit Your Workshop Changes

If you haven't committed your workshop changes yet, do it now:

```bash
git add -A
git commit -m "Workshop: implement [feature name] from exercise 06/12"
git push origin main
```

## Exercise 1 — Generate a PR Description

If you have uncommitted changes or a branch to push to a PR:

1. Stage your changes and open Copilot Chat in Agent mode
2. Ask:

```
I've just implemented [describe the feature — e.g. report assignment from exercise 12].

Generate a comprehensive Pull Request description for these changes. Include:
- A clear summary of what was implemented
- Why this feature is needed (business context)
- What files were changed and why
- Any database migrations included
- Testing instructions for the reviewer
- Any known limitations or follow-up items

Base the description on the actual git diff.
```

3. Review the generated description:
   - Is the technical summary accurate?
   - Are the testing instructions specific enough for a reviewer to follow?
   - Does it mention the migrations correctly?

4. Use the description when creating your PR on GitHub

## Exercise 2 — Use Copilot Code Review

Copilot can review an existing PR and leave structured comments.

1. Go to your CityOps fork on GitHub
2. Open any Pull Request (the one from Module 11's Copilot Coding Agent is ideal)
3. In the PR, find the **Copilot review** option:
   - Click the **Review** button
   - Select **Request Copilot review**
4. Wait for Copilot to post its review comments

> [!NOTE]
> If Copilot Code Review isn't available in your plan, use the VS Code alternative below.

### VS Code Alternative

1. Open the PR diff locally using the GitHub Pull Requests extension
2. Select all changed files
3. Ask Copilot Chat:

```
Review this Pull Request diff as an experienced TypeScript/Next.js developer. Focus on:
1. Correctness — does the logic do what the PR description says?
2. Security — any RBAC or tenant isolation issues?
3. Performance — any N+1 queries or missing Prisma includes?
4. Code style — does it follow the patterns in .github/copilot-instructions.md?

For each issue, specify: file, line, severity (blocker/concern/suggestion), and recommended fix.
```

## Exercise 3 — Respond to Review Comments

For each Copilot review comment:

1. Read it carefully — is it a genuine issue or a false positive?
2. If genuine, implement the fix:

```
Copilot's review flagged this issue: [paste the comment]

Implement the fix while keeping the rest of the code unchanged.
```

3. If a false positive, explain why and dismiss the comment with a note — this helps you understand Copilot's blind spots

## Exercise 4 — Review Copilot's Own Code

Now turn the tables — review the PR that Copilot Coding Agent raised in Module 11.

1. Open the PR from the Coding Agent
2. Request a Copilot review on it
3. Note the meta-irony: one Copilot instance reviewing another's work

Look specifically for:

- Does the review catch the same things you caught manually in Module 11?
- Does it miss anything that you found?
- Are any of its suggestions contradictions to your custom instructions?

If a suggestion contradicts your instruction files:

```
Copilot's review suggested [X], but our .github/copilot-instructions.md says [Y]. Which is correct for this project?
```

## Exercise 5 — Automate PR Reviews with GitHub Actions

For teams, it's useful to automatically request a Copilot review on every PR.

1. Create `.github/workflows/copilot-review.yml`
2. Ask Copilot to generate it:

```
Create a GitHub Actions workflow that automatically requests a Copilot code review on every new Pull Request targeting the main branch. It should only run if the PR is not a draft.
```

3. Review the generated workflow — verify it uses the correct GitHub Actions syntax and permissions

## Summary

You've used Copilot to generate PR descriptions and review code — completing the full development loop. Copilot is particularly good at catching missing error handling, style inconsistencies, and obvious logic errors. It's less reliable for subtle security issues and business logic correctness — those still need human eyes.

Key takeaways:

- AI-generated PR descriptions save time and improve consistency — but always verify technical accuracy
- Copilot code review complements human review — use it as a first pass, not a replacement
- Reviewing AI-generated code with AI review catches some issues — but human judgment is still essential for security and correctness
- Use the feedback loop: Copilot writes code → Copilot reviews it → You make the final call

## Resources

- [GitHub Copilot code review](https://docs.github.com/en/copilot/using-github-copilot/code-review/using-copilot-code-review)
- [GitHub Pull Requests VS Code extension](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github)
