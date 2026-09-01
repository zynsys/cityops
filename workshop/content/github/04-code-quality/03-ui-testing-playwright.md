# UI Testing with Playwright

> **Topic**: Testing | **Time**: 25 min

Playwright is the go-to tool for end-to-end UI testing of Next.js applications. In this module you'll use Copilot to generate Playwright tests for key CityOps user journeys — from citizen report submission to staff triage flows.

## Learning Objectives

- Set up Playwright in a Next.js project with Copilot assistance
- Generate end-to-end tests for citizen and staff workflows
- Use Copilot to fix failing tests and improve selectors
- Understand the difference between unit tests and E2E tests in this stack

## Background

Playwright tests run against a real browser and are ideal for testing:

- Multi-step user journeys (register → verify → submit report)
- Staff workflows (sign in → view dashboard → change report status)
- Authentication flows
- Responsive layout checks

CityOps already has a Next.js frontend — Playwright integrates cleanly and can be run locally or in CI.

## Step 1 — Install Playwright

Ask Copilot to scaffold Playwright for this project:

```
I want to add Playwright end-to-end tests to this Next.js project.
The project uses TypeScript strict mode and runs on localhost:3000.

Generate the setup steps and a playwright.config.ts that:
- Points to localhost:3000
- Uses chromium only for now
- Stores test files in tests/e2e/
- Takes screenshots on failure
```

Apply the generated config and run:

```bash
npx playwright install --with-deps chromium
```

## Step 2 — Test the Citizen Report Submission Flow

This is the most important user journey. Ask Copilot to generate it:

```
#file:src/app/(public)/reports/page.tsx
#file:src/app/(public)/reports/new/page.tsx
#file:src/components/reports/ReportForm.tsx

Generate a Playwright end-to-end test for the citizen report submission flow:
1. Navigate to /reports/new
2. Fill in the report title, description, and category
3. Drop a pin on the map (use a hardcoded lat/lng for the test)
4. Submit the form
5. Assert the user is redirected to the report detail page
6. Assert the report status is "Under Validation"

Use TypeScript, follow the page object model pattern, and add data-testid attributes to the source components where needed.
```

Review and apply the generated test and any `data-testid` additions.

## Step 3 — Test the Staff Triage Flow

```
#file:src/app/staff/reports/page.tsx
#file:src/components/staff/ReportStatusUpdate.tsx

Generate a Playwright test for the staff triage flow:
1. Sign in as a staff user (use credentials from the seed data)
2. Navigate to the staff reports dashboard
3. Find the first report with status "Validated"
4. Change the status to "In Progress"
5. Assert the status badge updates on screen

Use a beforeAll hook to authenticate once for the suite.
```

## Step 4 — Fix a Failing Test with Copilot

Run your tests:

```bash
npx playwright test
```

If any tests fail, attach the Playwright error and screenshot to Copilot:

```
This Playwright test is failing. Here is the error output and the failure screenshot.
#file:tests/e2e/report-submission.spec.ts

Diagnose the failure and suggest a fix. Do not change the underlying component — only fix the selector or assertion.
```

## Step 5 — Generate an Accessibility Snapshot Test

```
#file:src/app/(public)/page.tsx

Generate a Playwright accessibility test for the CityOps public homepage using @axe-core/playwright.
Check for WCAG 2.1 AA violations. Fail the test if any critical violations are found.
```

## Summary

You've used Copilot to:

- Scaffold Playwright configuration
- Generate realistic E2E tests for citizen and staff journeys
- Debug failing tests with screenshot context
- Add basic accessibility checks

These tests complement unit tests by catching regressions at the integration level.

## Resources

- [Playwright documentation](https://playwright.dev/docs/intro)
- [Next.js testing with Playwright](https://nextjs.org/docs/app/building-your-application/testing/playwright)
- [axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
