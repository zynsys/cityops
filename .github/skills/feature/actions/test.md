# Test Action

1. Read `context/current-feature.md` to understand the Goals and Plan.
2. Verify Status is "In Progress" and every implementation checklist item is complete.
3. If implementation is incomplete, stop and list the unfinished Plan items.
4. Review the feature diff against Goals and Plan:
   - Confirm every Goal is met.
   - Confirm planned behavior and preserved constraints are satisfied.
   - Flag bugs, incomplete work, and changes outside feature scope.
5. Identify testable logic added or modified by the feature and check existing coverage.
6. Add focused tests where meaningful:
   - Use the repository's existing test tools and patterns.
   - Cover expected behavior, boundaries, and error cases relevant to the Goals.
   - Do not add tests that only duplicate implementation details.
7. Run the focused tests and every final validation command listed in the Plan.
8. If a check fails, fix feature-related issues and rerun the smallest relevant check.
9. Set Status to "Complete" only when Goals, Plan, scope review, and all validations pass. Otherwise leave it "In Progress".
10. Report:
    - Goal and Plan completion.
    - Tests and validation results.
    - Files changed with a brief explanation.
    - Final verdict: ready for `/feature complete` or needs changes.