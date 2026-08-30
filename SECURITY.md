# Security Policy

Security is especially important to CityOps because the platform processes citizen reports and separates data belonging to multiple local-authority tenants.

## Supported versions

CityOps is currently developed and deployed from the `main` branch. Security fixes are applied to `main`; older commits, forks, and unofficial deployments are not formally supported.

## Report a vulnerability

Do not disclose suspected vulnerabilities in a public issue, discussion, pull request, or other public channel.

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/zynsys/cityops/security/advisories/new). Include as much of the following information as possible:

- A clear description of the vulnerability and its potential impact
- The affected component, route, role, or tenant boundary
- Reproduction steps or a minimal proof of concept
- Any prerequisites or configuration needed to reproduce the issue
- Suggested remediation, if known

Please avoid accessing, modifying, or retaining data that does not belong to you. Use test accounts and test data whenever possible.

## What to expect

Maintainers will confirm receipt as soon as practical, assess severity and scope, and coordinate remediation and disclosure with the reporter. Please allow time for a fix to be developed, tested, and deployed before publishing details.

## Security priorities

Reports involving the following areas are particularly important:

- Cross-tenant data access or missing `tenantId` enforcement
- Authentication, session, or role-based access control bypasses
- Exposure of citizen information, credentials, secrets, or connection strings
- Injection, cross-site scripting, request forgery, or unsafe file upload behavior
- Unauthorized report lifecycle changes or administrative actions
- Azure infrastructure, storage, Key Vault, or deployment configuration weaknesses
- AI-assisted moderation behavior that allows an authorization or tenant boundary to be bypassed

If a secret has been exposed, revoke or rotate it immediately before continuing with the normal reporting process.

## Out of scope

The following generally do not qualify unless they demonstrate a concrete security impact:

- Automated scanner output without a reproducible vulnerability
- Missing security headers with no demonstrated exploit
- Denial-of-service testing that could affect shared or production services
- Social engineering, spam, or physical attacks
- Vulnerabilities that depend on unsupported or substantially modified deployments

Thank you for helping keep CityOps and its users safe.
