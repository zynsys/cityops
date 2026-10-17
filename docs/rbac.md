# RBAC Matrix — CityOps

## 1. Roles

| Role | Who | `tenantId` in session |
|---|---|---|
| _(unauthenticated)_ | Anonymous public visitor | none |
| `citizen` | Registered member of the public | their registered council (or default) |
| `authority_user` | Council frontline staff — handles day-to-day report triage, status updates, assignment | their council |
| `tenant_admin` | Council administrator — configures and manages their council's CityOps setup; typically 1 per council | their council |
| `platform_admin` | CityOps platform operator — manages the platform itself (tenants, global settings); has **read-only cross-tenant visibility** for support and audit purposes | `"platform"` pseudo-tenant |

---

## 2. Platform Admin — Access Design

Platform admin is a SaaS super-user: **read everything, write nothing on tenant data.**

**Why read-only on tenant data?**
- Councils (tenants) are customers who expect data isolation. Platform admin reading their data for support/audit is acceptable and necessary. Mutating their data — changing report status, assigning staff members — crosses the trust boundary and creates accountability problems (who made the change: the council or the platform operator?).
- All major SaaS platforms follow this pattern: operators can see tenant data for support but cannot act on it.

**Platform admin access model:**
- Full CRUD on platform-level concepts: tenants, platform users, global settings, default category library
- **Read-only** access to tenant data: reports, categories, users — accessible via `/platform/*` views only, never through `/staff/*`
- All platform admin access to tenant data is logged in an audit trail
- The UI presents tenant data in a clearly distinct "support/audit" view, not the council operations UI

---

## 3. Navigation Links

| Nav Link | Route | Unauth | `citizen` | `authority_user` | `tenant_admin` | `platform_admin` |
|---|---|:---:|:---:|:---:|:---:|:---:|
| All Reports | `/reports` | ✅ | ✅ | ✅ | ✅ | — |
| Map | `/map` | ✅ | ✅ | ✅ | ✅ | — |
| Local Alerts | `/alerts` | ✅ | ✅ | — | — | — |
| Help | `/help` | ✅ | ✅ | — | — | — |
| Council Reports | `/staff/reports` | — | — | ✅ | ✅ | — |
| Categories | `/staff/categories` | — | — | — | ✅ | — |
| Users | `/staff/users` | — | — | — | ✅ | — |
| Tenants _(future)_ | `/platform/tenants` | — | — | — | — | ✅ |
| Reports _(future, read-only)_ | `/platform/reports` | — | — | — | — | ✅ |
| Users _(future)_ | `/platform/users` | — | — | — | — | ✅ |
| Platform Admins _(future)_ | `/platform/admins` | — | — | — | — | ✅ |
| Platform Settings _(future)_ | `/platform/settings` | — | — | — | — | ✅ |

**Notes:**
- `platform_admin` has a completely separate nav under `/platform/*`. They cannot access `/staff/*`.
- Until `/platform/*` is built, `platform_admin` sees no nav links — just their user menu.
- `authority_user` can see All Reports and Map as public context, but not citizen-support links.

---

## 4. User Menu (dropdown)

| Item | `citizen` | `authority_user` | `tenant_admin` | `platform_admin` |
|---|:---:|:---:|:---:|:---:|
| Profile (`/profile`) | ✅ | ✅ | ✅ | ✅ |
| My Reports (`/my-reports`) | ✅ | — | — | — |
| Sign Out | ✅ | ✅ | ✅ | ✅ |

---

## 5. Route Access (middleware guards)

| Route prefix | Allowed roles | Notes |
|---|---|---|
| `/` (home) | everyone | always public |
| `/reports` | everyone | public reports list |
| `/analytics` | everyone | public analytics dashboard (aggregate data only) |
| `/map` | everyone | public map |
| `/alerts` | everyone | public |
| `/help` | everyone | public |
| `/reports/*` | everyone | public report detail; `/reports/new` requires auth |
| `/sign-in`, `/register`, etc. | everyone (unauth only) | redirects signed-in users away |
| `/my-reports` | any authenticated | enforced by page-level session check |
| `/profile` | any authenticated | enforced by page-level session check |
| `/staff/*` | `authority_user`, `tenant_admin` | middleware redirects others to `/403` |
| `/admin/*` | `tenant_admin`, `platform_admin` | middleware redirects others to `/403` |
| `/platform/*` | `platform_admin` | middleware redirects others to `/403` |

---

## 6. Data Scope

| Resource | `citizen` | `authority_user` | `tenant_admin` | `platform_admin` |
|---|---|---|---|---|
| Reports (read) | own submitted + public view | own council only | own council only | all tenants, read-only _(future `/platform/reports`)_ |
| Reports (write — status, priority, assign) | — | own council only | own council only | **never** |
| Categories (read) | all active (submission form) | own council only | own council only | all tenants, read-only _(future)_ |
| Categories (CRUD) | — | — | own council only | default library only _(future `/platform/categories`)_ |
| Users (read/invite) | — | — | own council only | all tenants, read-only via `/platform/users` _(future)_ |
| Tenants | — | — | own tenant (read-only) | all — full CRUD _(future `/platform/tenants`)_ |
| Reports / analytics | public aggregate | public aggregate | public aggregate | cross-tenant aggregate _(future)_ |

**Key constraints:**
- All `/staff/*` queries scope data by `session.user.tenantId` from the JWT — never from URL params.
- `platform_admin` writes to tenant data through platform tooling only (e.g. seeding default categories at tenant onboarding), never through the council staff UI.

---

## 7. Post Sign-in Redirect

| Role | Redirect destination |
|---|---|
| `authority_user` | `/staff/reports` |
| `tenant_admin` | `/staff/reports` |
| `platform_admin` | `/platform` _(future; `/` for now)_ |
| `citizen` | `/` |

---

## 8. Future: Platform Admin Section (`/platform/*`)

`platform_admin` navigates here exclusively. Planned screens:

| Screen | Route | Access type | Purpose |
|---|---|---|---|
| Tenants | `/platform/tenants` | Read + Write | CRUD for councils — onboard, suspend, configure |
| Tenant Detail | `/platform/tenants/[slug]` | Read-only | Overview of a council: user count, report stats, categories |
| Tenant Reports | `/platform/tenants/[slug]/reports` | **Read-only** | Support view of a council's report queue — no action buttons |
| Cross-tenant Reports | `/platform/reports` | **Read-only** | Search/filter reports across all councils — support/audit tool |
| Users | `/platform/users` | **Read-only** | Cross-tenant view of all council users (staff, tenant admins, citizens) — support/audit tool |
| Platform Admins | `/platform/admins` | Read + Write | Manage platform admin accounts |
| Default Categories | `/platform/categories` | Read + Write | Global category library pushed to new tenants at onboarding |
| Platform Settings | `/platform/settings` | Read + Write | Global config (limits, feature flags, etc.) |
| Audit Log | `/platform/audit` | Read-only | Immutable cross-tenant activity log |


