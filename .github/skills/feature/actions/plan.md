# Plan Action

1. Read `context/current-feature.md` and verify Goals are populated.
2. If Goals are empty, stop with: "Run /feature load first".
3. Read every referenced specification and the code directly related to the goals.
4. Search for existing patterns, shared helpers, tests, and all affected call sites before proposing changes.
5. Replace the placeholder under `## Plan` with an ordered checklist that:
   - Maps every step to one or more Goals.
   - Names the files or code areas expected to change.
   - States the intended behavior and constraints, not just the edit.
   - Includes focused tests and the final lint/build checks required for the change.
   - Calls out behavior that must remain unchanged.
6. Keep the plan implementation-ready: no unresolved design choices, vague steps, or unrelated work.
7. Set Status to "Planned".
8. Do not create a branch or modify application code during this action.
9. Show the completed plan and confirm it is ready for `/feature implement`.
