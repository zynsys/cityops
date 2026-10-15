# Implement Action

1. Read `context/current-feature.md`.
2. Verify Status is "Planned" and `## Plan` contains an ordered implementation checklist.
3. If the feature is not planned, stop with: "Run /feature plan first".
4. Create and checkout the feature branch derived from the H1 heading.
5. Set Status to "In Progress".
6. Execute the Plan in order:
   - Follow the named scope, constraints, and preserved behaviors.
   - Reuse existing patterns and helpers identified by the Plan.
   - Mark each checklist item complete only after its implementation and focused validation succeed.
   - Do not add unrelated changes.
7. If code discovery invalidates a planned step, update that step in `## Plan` with the reason before continuing.
8. Run every validation command listed in the Plan.
9. Report completed plan items, validation results, and any remaining work.
