# Exercise 10 — Testing with Copilot

Tests give you confidence that the code Copilot generates actually works — and that it keeps working when you change things. In this module you'll use Copilot to generate unit and integration tests for real CityOps code: authentication middleware, RBAC checks, and API routes.

## Learning Objectives

- Generate unit tests for utility functions and middleware
- Generate integration tests for API routes
- Use Copilot to identify edge cases you might have missed
- Iterate on test quality with follow-up prompts

## Step 1 — Set Up the Test Framework

CityOps uses Node's built-in test runner or Jest. Check which is configured:

```bash
cat package.json | grep -A 5 '"test"'
```

If no test framework is configured, ask Copilot to set one up:

```
Set up Jest with ts-jest for testing in this Next.js project. Add the configuration to jest.config.ts and add a "test" script to package.json. Follow the Next.js testing documentation patterns.
```

## Exercise 1 — Test the Session Utilities

`src/lib/session.ts` contains `getRequiredSession()`, `getOptionalSession()`, and `hasRole()` — critical security utilities. Let's test them.

1. Open `src/lib/session.ts`
2. Open Copilot Chat in Agent mode
3. Ask:

```
Generate comprehensive unit tests for src/lib/session.ts. Cover:
- getRequiredSession() throws when no session exists
- getRequiredSession() returns the session when valid
- getOptionalSession() returns null when no session (without throwing)
- hasRole() returns true when the user has the exact role
- hasRole() returns false when the user has a lower-privilege role
- Edge cases: malformed session objects, missing fields

Use Jest and mock the Auth.js session. Place tests in src/lib/__tests__/session.test.ts
```

4. Review the generated tests:
   - Are the mock objects typed correctly?
   - Do the test names clearly describe what's being tested?
   - Are edge cases covered (null session, wrong role, etc.)?

## Exercise 2 — Test the Auth Middleware

The middleware in `middleware.ts` is the first line of defence for protected routes. Test it thoroughly.

1. Ask Copilot:

```
Generate unit tests for middleware.ts. Cover these scenarios:
- Public routes (/, /map, /reports/[id]) are accessible without authentication
- /staff/* routes redirect to /sign-in when unauthenticated
- /admin/* routes are accessible to TenantAdmin but not AuthorityUser
- /platform/* routes are only accessible to PlatformAdmin
- Valid session with correct role passes through
- Expired or malformed JWT is rejected

Mock the NextAuth JWT verify function. Place tests in __tests__/middleware.test.ts
```

2. Run the tests:

```bash
npm test
```

3. If tests fail, ask Copilot to fix them:

```
The middleware tests are failing with [paste error]. Fix the mock setup — the issue is likely that [describe what you observe].
```

## Exercise 3 — Test an API Route

API routes are where most security issues live. Test a report-related route end-to-end.

1. Choose an API route to test — e.g. `src/app/api/reports/route.ts`
2. Ask Copilot:

```
Generate integration tests for src/app/api/reports/route.ts. Cover:
- GET returns 401 when unauthenticated
- GET returns reports scoped to the user's tenantId (not reports from other tenants)
- GET does not return is_internal comments in the response
- POST creates a report and associates it with the correct tenantId
- POST returns 400 for invalid input (missing required fields)
- POST returns 403 if called by a Citizen role (if restricted)

Use fetch to call the route handler directly. Mock the Prisma client and Auth.js session.
```

3. Review the generated tests for security coverage:
   - Does the test verify tenant isolation (reports from other tenants are not returned)?
   - Does it check that internal comments are filtered?

## Exercise 4 — Use Copilot to Find Missing Test Cases

Copilot can analyse your test file and suggest additional cases.

1. Open a completed test file
2. Ask:

```
Review the tests in this file. What important scenarios are missing? Focus on security edge cases, boundary conditions, and anything related to CityOps's multi-tenant model.
```

3. For each suggestion, ask Copilot to generate the additional test:

```
Generate the missing test for the scenario: "a staff user from TenantA cannot access reports belonging to TenantB even with a valid session"
```

## Summary

You've used Copilot to generate tests for the three most critical areas of CityOps: session utilities, auth middleware, and API routes. Copilot is particularly good at generating edge cases — but always review the tests to ensure they actually assert the right things.

Key takeaways:

- Describe test scenarios in terms of behaviour ("returns 401 when unauthenticated"), not implementation
- Always verify that security tests are actually asserting tenant isolation — not just checking status codes
- Use Copilot to find missing cases — it often suggests things you haven't thought of
- Tests on AI-generated code are especially important — they catch when Copilot got something wrong

## Resources

- [Next.js testing documentation](https://nextjs.org/docs/app/building-your-application/testing)
- [Jest documentation](https://jestjs.io/docs/getting-started)
