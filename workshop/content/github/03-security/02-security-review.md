# Security Review with Copilot

CityOps stores sensitive citizen data and enforces strict multi-tenant isolation. A single security mistake could expose one council's data to another. In this module you'll use Copilot — and your custom `rbac-reviewer` agent — to systematically identify security gaps in the codebase.

## Learning Objectives

- Use Copilot to review authentication and authorisation code
- Apply the `rbac-reviewer` agent to find tenant isolation violations
- Identify common Next.js security pitfalls in the codebase
- Prioritise findings by severity and create actionable GitHub Issues

## OWASP Top 10 Focus Areas for CityOps

| OWASP Category                  | CityOps Risk                                                   |
| ------------------------------- | -------------------------------------------------------------- |
| A01 — Broken Access Control     | Tenant data leaking across councils                            |
| A02 — Cryptographic Failures    | Passwords, tokens, secrets in code                             |
| A03 — Injection                 | Prisma ORM protects against SQLi, but raw queries are a risk   |
| A05 — Security Misconfiguration | Missing auth on API routes, public exposure of internal fields |
| A07 — Auth Failures             | Missing `getRequiredSession()` calls, JWT not validated        |

## Exercise 1 — Scan API Routes with the RBAC Reviewer Agent

1. Open Copilot Chat
1. Invoke the RBAC reviewer agent if it is already available. Otherwise, use the prompt directly now and revisit this exercise after creating the agent in **Module 6 — Extend and Govern GitHub Copilot**:

```text
@rbac-reviewer Perform a complete security audit of all API routes in src/app/api/. For each route file:
1. Check it calls getRequiredSession() or getOptionalSession() appropriately
2. Check all database queries include tenantId scoping where required
3. Check that sensitive fields (is_internal, personal contact details) are not returned to unauthorised users
4. Report findings as: CRITICAL, HIGH, MEDIUM, or INFO
```

1. Review each finding — are they genuine issues or false positives?
1. For each CRITICAL or HIGH finding, note the file and line number

## Exercise 2 — Review the Auth Middleware

1. Open `middleware.ts`
1. Ask Copilot:

```text
Review middleware.ts for security issues. Specifically:
- Is the public routes allow-list correct? Are any routes that should be protected accidentally included?
- What happens if a user has a valid session but their role has been downgraded in the database since their JWT was issued?
- Is there any way to bypass the middleware using URL encoding or path traversal?
- What is the security implication of this middleware running at the Edge (no database access)?
```

1. This last question surfaces a real architectural concern — the JWT contains the role at sign-in time. If an admin revokes a user's role, the old JWT is still valid until it expires. Ask:

```text
What is the recommended approach for handling role revocation in a JWT-based Next.js app? What would need to change in CityOps to implement it?
```

## Exercise 3 — Check for Secrets and Sensitive Data

1. Ask Copilot to scan for hardcoded secrets:

```text
Search the codebase for any hardcoded secrets, API keys, passwords, or connection strings. Check .env.example to understand what should be in environment variables and verify none of the actual values appear in source files.
```

1. Check for debug code that might expose sensitive data:

```text
Search for console.log, console.error, and similar calls in src/lib/ and src/app/api/. Identify any that might log sensitive data such as passwords, tokens, user PII, or database query results containing private fields.
```

## Exercise 4 — Review the Registration and Password Reset Flow

Authentication endpoints are high-value targets.

1. Ask Copilot:

```text
Review the citizen registration flow (src/app/register/ and the corresponding API route). Check for:
- Email enumeration: does the API reveal whether an email is already registered?
- Rate limiting: is there any protection against bulk account creation?
- Password strength: what validation is applied to the password field?
- Email verification: is the verification token strong enough and does it expire?
```

1. Ask about password reset:

```text
Review the password reset flow. Check:
- Is the reset token cryptographically random and sufficiently long?
- Does the token expire after a reasonable time?
- Is the old password invalidated immediately on reset?
- Can the token be used more than once?
```

## Exercise 5 — Create Issues for Genuine Findings

For each genuine security finding:

1. Ask Copilot to create a GitHub Issue:

```text
Using the GitHub MCP, create a GitHub Issue for this security finding: [describe the finding].
Label it: security, and use this format:
- Summary of the vulnerability
- Steps to reproduce or exploit
- Recommended fix
- Severity: [CRITICAL/HIGH/MEDIUM/LOW]
```

1. For CRITICAL or HIGH findings, also ask for a fix:

```text
Implement the fix for [the finding]. Follow existing patterns and ensure the fix doesn't break existing functionality.
```

## Summary

You've performed a systematic security review of CityOps using Copilot — covering API authorisation, middleware gaps, secret exposure, and authentication flows. The `rbac-reviewer` agent provided consistent, CityOps-specific analysis across all API routes.

Key takeaways:

- Use specialised agents for consistent, repeatable security checks
- JWT-based auth has inherent latency in role revocation — understand the tradeoff
- Email enumeration in auth flows is a common oversight — always return the same response regardless of whether the email exists
- Copilot finds patterns but doesn't replace manual review — always validate findings

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js security documentation](https://nextjs.org/docs/app/building-your-application/authentication)
- [Auth.js security considerations](https://authjs.dev/concepts/security)
