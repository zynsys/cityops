# CityOps – Data Model

## Table of Contents

- [1. Conventions](#1-conventions)
- [2. Entity Overview](#2-entity-overview)
- [3. Enums & Lookup Values](#3-enums--lookup-values)
- [4. Entity Definitions](#4-entity-definitions)
- [5. Relationships](#5-relationships)
- [6. Tenant Scoping](#6-tenant-scoping)
- [7. Indexing Strategy](#7-indexing-strategy)

---

## 1. Conventions

| Convention | Rule |
|---|---|
| Naming | `snake_case` for tables and columns |
| Primary keys | `id` column, UUID v7 (time-sortable) |
| Timestamps | Every table has `created_at` and `updated_at` (timestamptz, non-null) |
| Soft deletes | Tables that support soft delete have `deleted_at` (timestamptz, nullable). Rows with a non-null `deleted_at` are excluded from normal queries. |
| Tenant column | `tenant_id` (UUID, non-null, FK → `tenant.id`) on all tenant-scoped tables. Exception: `report.tenant_id` is nullable to support reports submitted in areas where no council has subscribed. |
| Foreign keys | Named `<referenced_table>_id` |
| JSONB | Used only for flexible metadata, tenant configuration maps, and extensible settings — not as a replacement for proper relational columns |
| Boolean defaults | Default to `false` unless the domain requires otherwise |
| String lengths | Enforced via `CHECK` constraints where business rules require limits |

---

## 2. Entity Overview

| Entity | Purpose | Tenant-scoped |
|---|---|---|
| `tenant` | A city or municipality operating on the platform | No (platform-level) |
| `tenant_boundary` | Geographic boundary polygon for a tenant — used to auto-detect the council from a map pin | No (platform-level) |
| `tenant_config` | Tenant-specific settings: branding, workflows, moderation thresholds | Yes |
| `user` | Any person registered on the platform | No (platform-level) |
| `role` | System-defined roles (citizen, authority_user, tenant_admin, platform_admin) | No (platform-level) |
| `user_role` | Maps a user to one or more roles within a tenant | Yes |
| `report_category` | Tenant-configurable report categories (e.g., Road Safety, Drainage) | Yes |
| `report` | A reported civic report | Yes |
| `report_attachment` | Image or file attached to an report | Yes |
| `report_assignment` | Assigns an report to an authority user | Yes |
| `report_comment` | Comment on an report by any participant | Yes |
| `report_activity` | Immutable log of every lifecycle event on an report | Yes |
| `duplicate_link` | Links two reports identified as duplicates | Yes |
| `ai_validation_result` | AI/rule-based moderation outcome for a submitted report | Yes |
| `notification` | A notification sent or pending for a user | Yes |
| `notification_template` | Tenant-specific notification templates | Yes |
| `notification_rule` | Tenant-specific rules controlling when notifications fire | Yes |
| `audit_log` | Immutable log of administrative and security-relevant actions | Yes (or platform-level for platform admin actions) |
| `reward_point_ledger` | Point transactions earned or spent by a user | Yes |
| `badge` | Badge definitions (platform-wide or tenant-specific) | Optional |
| `user_badge` | Badges awarded to a user | Yes |
| `session` | Active user sessions with secure token and expiry | Yes |
| `password_reset_token` | Time-limited tokens for password reset flows | Yes |
| `email_verification_token` | Tokens for email address confirmation | Yes |
| `account` | Links external OAuth provider identities to a user | Yes |
| `verification_token` | NextAuth email verification / magic-link tokens | No (platform-level) |

---

## 3. Enums & Lookup Values

### 3.1 Tenant Status

| Value | Description |
|---|---|
| `active` | Tenant is operational |
| `suspended` | Tenant is temporarily disabled |
| `deactivated` | Tenant is permanently disabled |
| `onboarding` | Tenant is being set up |

### 3.2 Roles

| Value | Description |
|---|---|
| `citizen` | Reports reports, tracks progress, earns rewards |
| `authority_user` | Reviews, manages, and resolves reports |
| `tenant_admin` | Configures tenant settings, manages local users |
| `platform_admin` | Manages tenants and platform-wide operations |

### 3.3 Report Status (Canonical Lifecycle)

| Value | Description |
|---|---|
| `created` | Submitted by a citizen, not yet validated |
| `under_validation` | Being evaluated by AI or rule-based checks |
| `validated` | Passed validation, ready for assignment |
| `invalid` | Failed validation or rejected |
| `assigned` | Assigned to an authority user |
| `in_progress` | Actively being worked on |
| `resolved` | Report has been fixed |
| `closed` | Report is finalized (no further action) |

Tenants may define additional intermediate states, but these canonical values must be preserved for cross-tenant reporting and analytics.

### 3.4 Report Priority

| Value |
|---|
| `low` |
| `medium` |
| `high` |
| `critical` |

### 3.5 AI Validation Outcome

| Value | Description |
|---|---|
| `valid` | Submission appears legitimate |
| `review_required` | Submission needs manual review |
| `invalid` | Submission is clearly invalid, spam, or abusive |

### 3.6 AI Moderation Reason

| Value | Description |
|---|---|
| `category_mismatch` | Image or text does not match selected category |
| `image_irrelevant` | Attached image is unrelated to the report |
| `image_unusable` | Image is empty, corrupted, or too low quality |
| `spam` | Repetitive, bot-like, or mass submission |
| `abusive_content` | Offensive or malicious content |
| `duplicate_suspected` | Likely duplicate of an existing report |
| `manual_override` | Human reviewer changed the AI outcome |

### 3.7 Notification Channel

| Value |
|---|
| `email` |
| `sms` |
| `push` |

### 3.8 Notification Status

| Value |
|---|
| `pending` |
| `sent` |
| `failed` |

### 3.9 Reward Transaction Type

| Value | Description |
|---|---|
| `earned` | Points awarded for a valid report or action |
| `redeemed` | Points spent on a reward |
| `expired` | Points expired per policy |
| `adjusted` | Manual adjustment by admin |

### 3.10 Attachment Type

| Value |
|---|
| `image` |
| `document` |

### 3.11 Activity Action

| Value | Description |
|---|---|
| `created` | Report was created |
| `status_changed` | Report status transitioned |
| `assigned` | Report was assigned to a user |
| `reassigned` | Report was reassigned |
| `commented` | Comment was added |
| `attachment_added` | Attachment was added |
| `priority_changed` | Priority was changed |
| `duplicate_linked` | Report was linked as a duplicate |
| `merged` | Report was merged into another |
| `validation_completed` | AI validation completed |
| `manually_reviewed` | Manual review decision recorded |

---

## 4. Entity Definitions

### 4.1 `tenant`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `name` | varchar(255) | no | | Display name (e.g., "City of Manchester") |
| `slug` | varchar(100) | no | | URL-safe identifier, unique |
| `domain` | varchar(255) | yes | | Custom domain if configured |
| `status` | tenant_status | no | `onboarding` | See enum 3.1 |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |
| `deleted_at` | timestamptz | yes | | Soft delete |

**Unique:** `slug`, `domain`

---

### 4.2 `tenant_config`

Stores tenant-specific settings as structured JSONB. One row per tenant per config namespace.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `namespace` | varchar(100) | no | | e.g., `branding`, `workflow`, `moderation`, `notification` |
| `config` | jsonb | no | `'{}'` | Structured settings for this namespace |
| `version` | integer | no | `1` | Incremented on each change |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |

**Unique:** (`tenant_id`, `namespace`)

---

### 4.3 `user`

Global identity table — not tenant-scoped. A person has exactly one account regardless of how many tenants they belong to. Tenant membership is managed via `user_role`.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `email` | varchar(255) | no | | Globally unique across all tenants |
| `password_hash` | varchar(255) | yes | | bcrypt or argon2 hash; null for OAuth-only users |
| `display_name` | varchar(150) | no | | Maps to NextAuth `name` field |
| `avatar_url` | text | yes | | Maps to NextAuth `image` field |
| `is_active` | boolean | no | `true` | |
| `email_verified_at` | timestamptz | yes | | Null = not verified; maps to NextAuth `emailVerified` field |
| `last_login_at` | timestamptz | yes | | |
| `invited_by_user_id` | uuid | yes | | FK → `user.id`, for invitation-based onboarding |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |
| `deleted_at` | timestamptz | yes | | Soft delete |

**Unique:** `email`

---

### 4.4 `role`

Platform-defined, not tenant-scoped.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `name` | varchar(50) | no | | See enum 3.2 |
| `description` | varchar(255) | yes | | |
| `created_at` | timestamptz | no | now() | |

**Unique:** `name`

Seeded with: `citizen`, `authority_user`, `tenant_admin`, `platform_admin`

---

### 4.5 `user_role`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `user_id` | uuid | no | | FK → `user.id` |
| `role_id` | uuid | no | | FK → `role.id` |
| `created_at` | timestamptz | no | now() | |

**Unique:** (`tenant_id`, `user_id`, `role_id`)

---

### 4.6 `report_category`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `name` | varchar(100) | no | | e.g., "Road Safety", "Street Lighting" |
| `slug` | varchar(100) | no | | URL-safe, unique within tenant |
| `description` | text | yes | | |
| `icon` | varchar(100) | yes | | Icon identifier or emoji |
| `color` | varchar(7) | yes | | Hex color for badge display |
| `sort_order` | integer | no | `0` | |
| `is_active` | boolean | no | `true` | |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |

**Unique:** (`tenant_id`, `slug`)

---

### 4.7 `report`

`tenant_id` and `category_id` are nullable to support **unassigned reports** — reports submitted by citizens in areas where no council has yet subscribed to CityOps. Unassigned reports appear on the public national map but cannot be actioned by staff until a council claims the area.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | **yes** | | FK → `tenant.id`. Null = unassigned (submitted in an unsubscribed area) |
| `category_id` | uuid | **yes** | | FK → `report_category.id`. Null when `tenant_id` is null (no tenant categories available) |
| `reporter_user_id` | uuid | no | | FK → `user.id` |
| `assigned_user_id` | uuid | yes | | FK → `user.id`, current assignee |
| `title` | varchar(255) | no | | |
| `description` | text | no | | |
| `status` | report_status | no | `created` | See enum 3.3 |
| `priority` | report_priority | yes | | See enum 3.4, set by authority |
| `location_text` | varchar(500) | yes | | Human-readable address |
| `location_point` | geography(Point, 4326) | yes | | PostGIS point geometry |
| `resolved_at` | timestamptz | yes | | When status moved to `resolved` |
| `closed_at` | timestamptz | yes | | When status moved to `closed` |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |
| `deleted_at` | timestamptz | yes | | Soft delete |

> **Unassigned report rules:**
> - An report is unassigned when `tenant_id IS NULL`.
> - Unassigned reports are publicly visible on the national map.
> - When a council subscribes and their `tenant_boundary` is loaded, a platform admin can bulk-assign existing unassigned reports within that boundary to the new tenant.
> - Application code must treat `tenant_id IS NULL` as a distinct state — never filter it in or out silently.

---

### 4.8 `report_attachment`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `report_id` | uuid | no | | FK → `report.id` |
| `uploaded_by_user_id` | uuid | no | | FK → `user.id` |
| `type` | attachment_type | no | | See enum 3.10 |
| `file_name` | varchar(255) | no | | Original filename |
| `file_size` | integer | no | | Bytes |
| `content_type` | varchar(100) | no | | MIME type |
| `storage_path` | text | no | | Blob storage path |
| `alt_text` | varchar(500) | yes | | Accessibility description |
| `created_at` | timestamptz | no | now() | |

---

### 4.9 `report_assignment`

Immutable log of every assignment (current and historical).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `report_id` | uuid | no | | FK → `report.id` |
| `assigned_to_user_id` | uuid | no | | FK → `user.id` |
| `assigned_by_user_id` | uuid | no | | FK → `user.id` |
| `is_current` | boolean | no | `true` | Only one `true` per report |
| `assigned_at` | timestamptz | no | now() | |
| `unassigned_at` | timestamptz | yes | | Set when reassigned |

---

### 4.10 `report_comment`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `report_id` | uuid | no | | FK → `report.id` |
| `user_id` | uuid | no | | FK → `user.id` |
| `body` | text | no | | Comment text |
| `is_internal` | boolean | no | `false` | Internal notes visible only to authority/admin |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |
| `deleted_at` | timestamptz | yes | | Soft delete |

---

### 4.11 `report_activity`

Immutable append-only log. No updates or deletes.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `report_id` | uuid | no | | FK → `report.id` |
| `user_id` | uuid | yes | | FK → `user.id`, null for system actions |
| `action` | activity_action | no | | See enum 3.11 |
| `old_value` | text | yes | | Previous value (e.g., old status) |
| `new_value` | text | yes | | New value (e.g., new status) |
| `metadata` | jsonb | yes | | Additional structured context |
| `created_at` | timestamptz | no | now() | |

---

### 4.12 `duplicate_link`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `source_report_id` | uuid | no | | FK → `report.id`, the duplicate |
| `target_report_id` | uuid | no | | FK → `report.id`, the canonical report |
| `linked_by_user_id` | uuid | no | | FK → `user.id` |
| `is_merged` | boolean | no | `false` | Whether the duplicate was merged |
| `created_at` | timestamptz | no | now() | |

**Unique:** (`source_report_id`, `target_report_id`)

---

### 4.13 `ai_validation_result`

One record per validation run on an report. An report may be re-validated.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `report_id` | uuid | no | | FK → `report.id` |
| `outcome` | ai_validation_outcome | no | | See enum 3.5 |
| `confidence_score` | numeric(5,4) | yes | | 0.0000–1.0000 |
| `reason_codes` | text[] | no | `'{}'` | Array of values from enum 3.6 |
| `reason_text` | text | yes | | Human-readable explanation |
| `reviewed_by_user_id` | uuid | yes | | FK → `user.id`, if manually reviewed |
| `review_outcome` | ai_validation_outcome | yes | | Override outcome after manual review |
| `reviewed_at` | timestamptz | yes | | |
| `model_version` | varchar(50) | yes | | AI model/rule version identifier |
| `raw_response` | jsonb | yes | | Full AI service response for debugging |
| `created_at` | timestamptz | no | now() | |

---

### 4.14 `notification`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `user_id` | uuid | no | | FK → `user.id`, recipient |
| `channel` | notification_channel | no | | See enum 3.7 |
| `status` | notification_status | no | `pending` | See enum 3.8 |
| `subject` | varchar(255) | yes | | Email subject or push title |
| `body` | text | no | | Rendered notification content |
| `reference_type` | varchar(50) | yes | | e.g., `report`, `comment` |
| `reference_id` | uuid | yes | | ID of the referenced entity |
| `sent_at` | timestamptz | yes | | |
| `failed_reason` | text | yes | | Delivery failure details |
| `created_at` | timestamptz | no | now() | |

---

### 4.15 `notification_template`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `event_type` | varchar(100) | no | | e.g., `report_status_changed`, `report_assigned` |
| `channel` | notification_channel | no | | See enum 3.7 |
| `subject_template` | varchar(500) | yes | | Template string with placeholders |
| `body_template` | text | no | | Template string with placeholders |
| `is_active` | boolean | no | `true` | |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |

**Unique:** (`tenant_id`, `event_type`, `channel`)

---

### 4.16 `notification_rule`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `event_type` | varchar(100) | no | | Triggering event |
| `channel` | notification_channel | no | | See enum 3.7 |
| `recipient_role` | varchar(50) | yes | | Role filter, null = all |
| `is_active` | boolean | no | `true` | |
| `conditions` | jsonb | yes | | Optional conditional filters |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |

---

### 4.17 `audit_log`

Immutable append-only. No updates or deletes.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | yes | | FK → `tenant.id`, null for platform-level actions |
| `user_id` | uuid | yes | | FK → `user.id`, null for system actions |
| `action` | varchar(100) | no | | e.g., `tenant.created`, `user.role_changed`, `config.updated` |
| `entity_type` | varchar(50) | no | | e.g., `tenant`, `user`, `report`, `tenant_config` |
| `entity_id` | uuid | no | | ID of the affected entity |
| `old_value` | jsonb | yes | | Previous state |
| `new_value` | jsonb | yes | | New state |
| `ip_address` | inet | yes | | Request origin |
| `user_agent` | text | yes | | |
| `created_at` | timestamptz | no | now() | |

---

### 4.18 `reward_point_ledger`

Append-only ledger. Current balance is derived by summing transactions.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `user_id` | uuid | no | | FK → `user.id` |
| `transaction_type` | reward_transaction_type | no | | See enum 3.9 |
| `points` | integer | no | | Positive for earned, negative for redeemed/expired |
| `reason` | varchar(255) | yes | | Human-readable reason |
| `reference_type` | varchar(50) | yes | | e.g., `report`, `badge` |
| `reference_id` | uuid | yes | | |
| `created_at` | timestamptz | no | now() | |

---

### 4.19 `badge`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | yes | | FK → `tenant.id`, null = platform-wide |
| `name` | varchar(100) | no | | e.g., "First Report", "100 Reports" |
| `slug` | varchar(100) | no | | |
| `description` | text | yes | | |
| `icon` | varchar(100) | yes | | Icon identifier |
| `criteria` | jsonb | no | | Rules for automatic award |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |

---

### 4.20 `user_badge`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `user_id` | uuid | no | | FK → `user.id` |
| `badge_id` | uuid | no | | FK → `badge.id` |
| `awarded_at` | timestamptz | no | now() | |

**Unique:** (`user_id`, `badge_id`)

---

### 4.21 `session`

Active user sessions for first-party email/password authentication. Tenant-scoped.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `user_id` | uuid | no | | FK → `user.id` |
| `token` | text | no | | Unique, cryptographically random session token |
| `ip_address` | inet | yes | | Client IP at session creation |
| `user_agent` | text | yes | | Browser/client user agent |
| `expires_at` | timestamptz | no | | Session expiry |
| `created_at` | timestamptz | no | now() | |

**Unique:** `token`

---

### 4.22 `password_reset_token`

Time-limited tokens for password reset flows. Tenant-scoped.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `user_id` | uuid | no | | FK → `user.id` |
| `token` | text | no | | Unique, hashed token |
| `expires_at` | timestamptz | no | | Token expiry |
| `used_at` | timestamptz | yes | | Set when token is consumed |
| `created_at` | timestamptz | no | now() | |

**Unique:** `token`

---

### 4.23 `email_verification_token`

Tokens for email address confirmation. Tenant-scoped.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `user_id` | uuid | no | | FK → `user.id` |
| `token` | text | no | | Unique, hashed token |
| `expires_at` | timestamptz | no | | Token expiry |
| `used_at` | timestamptz | yes | | Set when token is consumed |
| `created_at` | timestamptz | no | now() | |

**Unique:** `token`

---

### 4.24 `account`

Links external OAuth/OIDC provider identities to a user. Allows one user to link multiple providers (e.g., Google, GitHub). Tenant-scoped.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id` |
| `user_id` | uuid | no | | FK → `user.id` |
| `provider` | varchar(100) | no | | Provider identifier e.g. `google`, `github` |
| `provider_account_id` | varchar(255) | no | | Provider's own user/account ID |
| `access_token` | text | yes | | OAuth access token (encrypted at rest) |
| `refresh_token` | text | yes | | OAuth refresh token (encrypted at rest) |
| `token_type` | varchar(50) | yes | | e.g. `Bearer` |
| `scope` | text | yes | | Granted OAuth scopes |
| `id_token` | text | yes | | OIDC ID token |
| `expires_at` | timestamptz | yes | | Token expiry |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |

**Unique:** (`provider`, `provider_account_id`)

---

### 4.25 `tenant_boundary`

Stores the geographic boundary polygon for each tenant. Used to resolve which council a citizen belongs to when they drop a pin on a map — the platform performs a spatial containment query against this table instead of requiring subdomain-based routing. Not tenant-scoped; managed by platform admins.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | gen_random_uuid() | PK |
| `tenant_id` | uuid | no | | FK → `tenant.id`, unique (one boundary per tenant) |
| `boundary` | geometry(MultiPolygon, 4326) | no | | PostGIS MultiPolygon. `MultiPolygon` supports non-contiguous areas (e.g. councils with detached wards or islands). |
| `source` | varchar(100) | yes | | Boundary data origin e.g. `ONS Open Geography`, `OS OpenData` |
| `source_ref` | varchar(100) | yes | | External reference code e.g. ONS GSS code (`E08000003` for Manchester) |
| `valid_from` | date | yes | | Date from which this boundary is effective |
| `created_at` | timestamptz | no | now() | |
| `updated_at` | timestamptz | no | now() | |

**Unique:** `tenant_id`

> **Spatial query for council detection:** When a citizen drops a pin, the application runs:
> ```sql
> SELECT tenant_id FROM tenant_boundary
> WHERE ST_Within(ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geometry, boundary)
> ```
> Results are ordered by `tenant.status = 'active'` and limited to 1. If no boundary matches, the citizen is prompted to select a council manually.

---

## 5. Relationships

### 5.1 Tenant → Everything

- `tenant` 1 → 1 `tenant_boundary` (optional — not all tenants need boundary data)
- `tenant` 1 → N `tenant_config`
- `tenant` 1 → N `report_category`
- `tenant` 1 → N `report`
- `tenant` 1 → N `notification_template`
- `tenant` 1 → N `notification_rule`

### 5.2 User Relationships

- `user` N → N `role` (through `user_role`)
- `user` 1 → N `report` (as reporter)
- `user` 1 → N `report_comment`
- `user` 1 → N `report_assignment` (as assignee)
- `user` 1 → N `notification` (as recipient)
- `user` 1 → N `reward_point_ledger`
- `user` N → N `badge` (through `user_badge`)
- `user` 1 → N `session`
- `user` 1 → N `password_reset_token`
- `user` 1 → N `email_verification_token`
- `user` 1 → N `account` (OAuth provider links)

### 5.3 Report Relationships

- `report` N → 1 `report_category`
- `report` N → 1 `user` (reporter)
- `report` N → 1 `user` (current assignee, optional)
- `report` 1 → N `report_attachment`
- `report` 1 → N `report_comment`
- `report` 1 → N `report_assignment`
- `report` 1 → N `report_activity`
- `report` 1 → N `ai_validation_result`
- `report` 1 → N `duplicate_link` (as source or target)
- `report` 1 → N `notification` (as reference)

---

## 6. Tenant Scoping

### Platform-level tables (no `tenant_id`)

| Table | Reason |
|---|---|
| `tenant` | Defines tenants themselves |
| `tenant_boundary` | Boundary polygons are platform-managed (loaded from ONS/OS data by platform admins) |
| `user` | Global identity — one account per person across all tenants |
| `role` | System-defined, shared across all tenants |
| `account` | NextAuth OAuth links — one user may link multiple providers |
| `session` | NextAuth session tokens — not tied to any one tenant |
| `verification_token` | NextAuth email verification tokens — not tied to any one tenant |

### Optionally tenant-scoped

| Table | Rule |
|---|---|
| `badge` | `tenant_id` is nullable — null means platform-wide badge |
| `audit_log` | `tenant_id` is nullable — null for platform admin actions |
| `report` | `tenant_id` is nullable — null means unassigned (submitted in an unsubscribed council area) |

### All other tables

Every remaining table has a non-null `tenant_id` foreign key. Application services and repository layers must enforce `tenant_id` filtering on every query.

---

## 7. Indexing Strategy

### 7.1 Primary Access Patterns

| Query | Index |
|---|---|
| Reports by tenant + status | `report(tenant_id, status)` |
| Unassigned reports | `report(status) WHERE tenant_id IS NULL` (partial index) |
| Reports by tenant + category | `report(tenant_id, category_id)` |
| Reports by tenant + reporter | `report(tenant_id, reporter_user_id)` |
| Reports by tenant + assignee | `report(tenant_id, assigned_user_id)` |
| Reports by tenant + created date | `report(tenant_id, created_at DESC)` |
| Nearby reports | `report(location_point)` using GiST spatial index |
| Council detection from pin | `tenant_boundary(boundary)` using GiST spatial index |
| User by email | `user(email)` (unique) |
| User roles by user | `user_role(user_id)` |
| Comments by report | `report_comment(report_id, created_at)` |
| Activity by report | `report_activity(report_id, created_at)` |
| Notifications by recipient | `notification(user_id, created_at DESC)` |
| Audit log by entity | `audit_log(entity_type, entity_id)` |
| Audit log by tenant + date | `audit_log(tenant_id, created_at DESC)` |
| Reward balance by user | `reward_point_ledger(tenant_id, user_id)` |
| Validation by report | `ai_validation_result(report_id)` |
| OAuth account by provider | `account(provider, provider_account_id)` (unique) |
| Accounts by user | `account(user_id)` |
| Session by token | `session(session_token)` (unique) |

### 7.2 Soft Delete Filtering

Tables with `deleted_at` should use partial indexes that exclude soft-deleted rows for queries that only need active records:

```sql
CREATE INDEX idx_report_active_by_tenant_status
ON report (tenant_id, status)
WHERE deleted_at IS NULL;
```

---
