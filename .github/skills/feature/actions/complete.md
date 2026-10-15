# Complete Action

1. Stage all changes and commit with a descriptive message
2. Switch to main and merge the feature branch (no push yet)
3. Delete the local feature branch
4. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear Goals, Notes, References sections (keep placeholder comments)
5. Append a short feature summary to the END of `context/HISTORY.md` using this format:
   - `- YYYY-MM-DD — **Feature name**: Summary`
   - Keep entries ordered from oldest to newest
6. Commit the workflow state: `chore: complete [feature] workflow`
7. Push main to origin ONCE (single push with all changes)
8. If feature branch was previously pushed, delete it from origin