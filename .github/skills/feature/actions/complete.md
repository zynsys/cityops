# Complete Action

1. Read `context/current-feature.md` and verify Status is "Complete".
2. If Status is not "Complete", stop with: "Run /feature test first".
3. Stage all changes and commit with a descriptive message
4. Switch to main and merge the feature branch (no push yet)
5. Delete the local feature branch
6. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Set Status to "Not Started"
   - Clear Goals, Notes, References, and Plan sections (keep placeholder comments)
7. Append a short feature summary to the END of `context/HISTORY.md` using this format:
   - `- YYYY-MM-DD — **Feature name**: Summary`
   - Keep entries ordered from oldest to newest
8. Commit the workflow state: `chore: complete [feature] workflow`
9. Push main to origin ONCE (single push with all changes)
10. If feature branch was previously pushed, delete it from origin