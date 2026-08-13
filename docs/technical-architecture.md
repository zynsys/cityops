# CityOps – Technical Architecture Document

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Application Module Design](#3-application-module-design)
- [4. Communication Patterns](#4-communication-patterns)
- [5. Data Architecture](#5-data-architecture)
- [6. Identity & Security](#6-identity--security)
- [7. Multi-Tenancy Architecture](#7-multi-tenancy-architecture)
- [8. Azure Deployment Architecture](#8-azure-deployment-architecture)
- [9. Observability & Monitoring](#9-observability--monitoring)
- [10. Scalability & Performance](#10-scalability--performance)
- [11. Fault Tolerance & Resilience](#11-fault-tolerance--resilience)
- [12. Integrations](#12-integrations)
- [13. Technology Stack (Proposed)](#13-technology-stack-proposed)
- [14. Risks & Mitigations](#14-risks--mitigations)
- [15. Future Enhancements](#15-future-enhancements)

## 1. Introduction

### 1.1 Purpose

This document defines the technical architecture of the CityOps platform, including system design, application boundaries, data flow, infrastructure, and operational concerns.

### 1.2 Scope

- High-level and detailed system architecture
- Application module design and responsibilities
- Azure deployment strategy
- Multi-tenancy architecture
- Non-functional implementation guidance

### 1.3 Related Documents

- Product Requirements Document (PRD)
- Feature Specifications
- API Specification (OpenAPI)
- Data Model Document

---

## 2. Architecture Overview

### 2.1 Architectural Style

CityOps will be implemented as a **multi-tenant modular monolith**.

Key characteristics:

- Next.js-based web application
- Node.js backend modular monolith, with NestJS preferred for structured domain boundaries and Express remaining an acceptable implementation option
- PostgreSQL relational data model for core transactional workflows
- PostGIS-enabled geospatial capabilities for location-aware features
- AI-assisted validation and moderation for report quality control
- Single deployable backend application for MVP
- Clear internal module boundaries by business domain
- Shared application platform for multiple tenants
- Asynchronous background processing where it improves responsiveness or reliability
- Cloud deployment on Azure

This approach is intentionally chosen to reduce operational complexity, accelerate delivery, and preserve a clean path for future extraction of individual modules only when justified by scale, team structure, or domain boundaries.

### 2.2 Architecture Principles

- Prefer simplicity over premature distribution
- Keep tenant isolation explicit at every layer
- Keep modules cohesive and loosely coupled inside the monolith
- Treat background work as asynchronous jobs, not as mandatory distributed microservices
- Use Azure managed services where they reduce operational burden and fit the chosen Next.js + Node.js + PostgreSQL stack
- Keep AI decisions reviewable, auditable, and overrideable by authorized users
- Design for observability, auditability, and controlled future evolution

### 2.3 High-Level Components

- Web Application (Next.js)
- Backend Application (Node.js modular monolith)
- Background Job Processing within the backend runtime or dedicated worker process
- Identity & Access Management
- Tenant Configuration and Administration
- Operational Data Store (PostgreSQL on Azure)
- AI Validation and Moderation Components
- File and Image Storage
- Optional Messaging Layer for asynchronous workflows
- Monitoring and Observability stack
- External Integrations

### 2.4 High-Level Flow

1. User interacts with the Next.js web application
2. Requests are sent to the Node.js backend API
3. The backend resolves tenant context from domain, route, authenticated session or token, or request metadata
4. Submission-related flows may pass through rule-based and AI-assisted validation checks
5. The appropriate internal module processes business rules and determines whether the report is valid, review-required, or invalid
6. Data is persisted with tenant-aware access controls and auditable validation outcomes
7. Background jobs are triggered for notifications, analytics, audit enrichment, and future AI tasks
8. Files and images are stored separately in Azure Blob Storage

---

## 3. Application Module Design

The backend is a single deployable application, but internally separated into domain-oriented modules.

### 3.1 Identity & Access Module

- Email-and-password registration and login flows
- Password hashing, credential verification, and password-policy enforcement
- Session/token issuance and validation
- User identity mapping
- Platform and tenant role enforcement

### 3.2 Tenant Management Module

- Tenant onboarding
- Tenant lifecycle management
- Branding and settings
- Tenant-level configuration loading and caching

### 3.3 User & Role Management Module

- User profiles
- Invitations and activation flows
- Tenant-scoped role assignments
- Platform admin assignments

### 3.4 Report Management Module

- Report creation
- Report lifecycle transitions
- Assignment workflows
- Comments, attachments, and activity history

### 3.5 Duplicate Detection Module

- Nearby report comparison
- Rule-based duplicate suggestions
- Future text and image similarity extensions

### 3.6 AI Validation & Moderation Module

- Rule-based submission checks
- Image relevance and quality validation
- Spam and abuse detection
- Confidence scoring and moderation decision support
- Manual review and override support for tenant-authorized users

### 3.7 Search & Discovery Module

- Filtered report lookup
- Map and proximity queries
- Query optimization and future indexing support

### 3.8 Notification Module

- Email notification generation and dispatch
- Tenant-specific template resolution
- Notification rules and delivery tracking

### 3.9 Analytics & Reporting Module

- Tenant-level aggregation
- Platform-level operational views for authorized admins
- Scheduled summary generation
- Validation quality reporting such as invalid-report rate and override rate

### 3.10 Rewards & Engagement Module

- Points and badge calculations
- Reputation logic
- Future engagement features

### 3.11 Audit & Administration Module

- Administrative audit trail
- Configuration change history
- Operational event traceability
- AI moderation outcome traceability and override history

### 3.12 Module Interaction Rules

- Modules communicate through in-process application services, domain events, or shared contracts
- Direct cross-module data access should be minimized and controlled
- Shared infrastructure concerns such as logging, configuration, caching, and email providers are implemented as platform services

---

## 4. Communication Patterns

### 4.1 Synchronous Communication

- REST APIs over HTTPS
- Used for:
  - User-driven create, read, update, and administrative operations
  - Submission-time validation responses where quick moderation feedback is required
  - Tenant configuration changes
  - Dashboard and search queries

### 4.2 Internal Application Communication

- In-process service calls between internal modules
- Domain events inside the application boundary for decoupling selected workflows

### 4.3 Asynchronous Communication

- Background jobs for:
  - Notifications
  - Audit enrichment
  - Analytics refresh
  - AI-assisted duplicate analysis in later phases
  - deeper moderation rechecks, model-assisted classification, and post-submission enrichment
- Azure Service Bus is optional for workflows that benefit from durable queueing or future external integration

### 4.4 Event Examples

- TenantCreated
- UserInvited
- ReportCreated
- ReportValidationCompleted
- ReportUpdated
- ReportResolved
- DuplicateLinked

---

## 5. Data Architecture

### 5.1 Primary Data Strategy

CityOps will use a relational operational data model because the platform is workflow-heavy, audit-sensitive, geospatially aware, and reporting-oriented.

Recommended MVP approach on Azure:

- Primary operational database: **Azure Database for PostgreSQL Flexible Server**
- Geospatial support: **PostGIS**
- File and image storage: **Azure Blob Storage**
- Cache: **Azure Cache for Redis** if needed for performance hot paths
- Search: start with PostgreSQL filtering, indexing, and full-text/geospatial capabilities; introduce **Azure AI Search** only when product scale or query complexity justifies it
- Store AI moderation results, review decisions, and confidence metadata in relational tables linked to the underlying report report and audit trail

### 5.2 Tenant Data Model

- All tenant-owned tables must include a `tenant_id`
- Shared tables are acceptable for MVP if tenant filters are mandatory and enforced consistently
- PostgreSQL row-level security may be introduced for selected high-sensitivity tables or as a broader tenant-isolation enforcement mechanism
- High-risk or regulated tenants may require stronger isolation in future phases

### 5.3 Data Partitioning

- Partitioning strategy must consider tenant growth, workload distribution, and noisy-neighbor risk
- The initial design should favor a shared relational model with logical isolation because it keeps implementation and operations simpler for MVP
- The database schema should be optimized for tenant-scoped transactional queries, reporting queries, and auditability
- Future options include tenant-tier-based partitioning, database-per-tenant, or deployment stamps for premium isolation

### 5.4 Geospatial Data

- Store coordinates and service areas with PostGIS-compatible data types
- Use geospatial indexes for nearby report discovery, duplicate suggestions, and map-based filtering

### 5.5 Blob and Attachment Storage

- Store images and attachments in Azure Blob Storage
- Organize blob paths and metadata with tenant-aware conventions
- Enforce file size, content type, retention, and access policies at upload and retrieval time

### 5.6 Relational Modeling Guidance

- Model core business entities explicitly, including tenants, users, roles, reports, assignments, comments, categories, notifications, workflow states, and audit records
- Use foreign keys and transactions for correctness on core operational workflows
- Use JSONB selectively for flexible tenant configuration, metadata, and extensible settings rather than as the default modeling pattern

### 5.7 AI Validation Data Model Guidance

- Store validation outcomes separately from raw user submissions so that original user input and system decisions remain traceable
- Persist fields such as validation status, moderation reason codes, confidence score, review status, and override metadata
- Ensure that AI-derived decisions are tenant-scoped, auditable, and suitable for later analytics and model tuning

---

## 6. Identity & Security

### 6.1 Authentication

- MVP authentication is first-party email-and-password authentication managed by the CityOps application
- Users register and sign in using their email address and password within the resolved tenant context
- Passwords must be hashed with a production-grade one-way hashing algorithm before storage, and plain-text passwords must never be persisted
- The backend should report secure authenticated sessions or signed access tokens after successful credential verification
- The architecture should preserve an extension path for future OAuth 2.0, OpenID Connect, or external identity-provider federation if business needs require it

### 6.2 Authorization

- Role-Based Access Control (RBAC)
- Roles include Citizen, Authority User, Tenant Admin, and Platform Admin
- Authorization decisions must be both role-aware and tenant-aware

### 6.3 Tenant-Safe Access Control

- Every tenant-scoped request must resolve and validate tenant context before business logic executes
- Tenant context must be enforced in queries, commands, background jobs, and reporting pipelines
- Platform-admin-only operations must be explicitly separated from tenant-admin operations

### 6.4 Data Security

- Encryption in transit and at rest
- Password hashes, credential-handling flows, and authentication secrets must be protected according to current security best practices
- Secure secrets and connection management through Azure Key Vault
- Secure file access patterns for attachments and generated exports

### 6.5 Compliance

- Support privacy and consent workflows
- Support deletion, export, and retention policies where required
- Maintain auditable administrative actions and security-relevant events
- AI-assisted moderation should support explainable reason codes or operator-readable outcomes where practical

---

## 7. Multi-Tenancy Architecture

### 7.1 Tenancy Model

- CityOps is a SaaS platform with multiple customer tenants
- Each city or municipality is a tenant
- MVP model: shared application deployment with logical tenant isolation

### 7.2 Tenant Resolution

Tenant context may be resolved using one or more of the following:

- Subdomain or custom domain
- Route segment
- Authenticated session or token claims
- Tenant selection during sign-in or authenticated session establishment

The detailed tenant resolution strategy will be fixed in the authentication and request-routing specifications.

### 7.3 Isolation Model

- Application layer isolation through strict tenant-aware service and repository patterns
- Data layer isolation through mandatory `tenantId` scoping and guarded administrative access
- Blob and export assets must also be tenant-scoped

### 7.4 Configuration Model

- Tenant-specific branding, report categories, workflows, templates, and business rules
- Shared platform guardrails to avoid unsafe or incompatible tenant customization
- Tenant config changes must be auditable
- Tenant configuration may include moderation thresholds, review queues, override permissions, and category-specific validation rules

### 7.5 Isolation Evolution Path

Future supported models may include:

- Shared database with stronger partition isolation
- Database-per-tenant
- Dedicated deployment stamp for premium or regulated tenants

---

## 8. Azure Deployment Architecture

### 8.1 Hosting Strategy

Recommended MVP hosting model on Azure:

- **Azure App Service** for the Next.js web application
- **Azure App Service** for the Node.js backend monolith
- Shared domain routing and environment-specific configuration to present a unified platform experience
- Separate deployment units for web and API to improve release safety while keeping the system architecture monolithic at the business layer

Alternative hosting option:

- **Azure Container Apps** if container-based packaging, sidecars, worker separation, or SSR/runtime controls become a near-term requirement

AKS is intentionally not the default MVP hosting choice because it increases operational complexity without clear early-stage benefit for a modular monolith.

### 8.2 Supporting Azure Services

- Azure Blob Storage for file storage
- Azure Key Vault for secrets
- Azure Monitor and Application Insights for observability
- Azure Service Bus for durable messaging where needed
- Azure Database for PostgreSQL Flexible Server for operational data
- Azure Cache for Redis for caching if needed
- Azure AI services for image analysis, classification, or content moderation where product requirements justify them
- Azure Front Door or CDN in later phases for global performance and edge routing

### 8.3 Environments

- Development
- QA
- Staging
- Production

Each environment should use isolated configuration, secrets, and deployment controls.

### 8.4 CI/CD Pipeline

- GitHub Actions for:
  - Build
  - Test
  - Static analysis
  - Package and deploy
- Deployment target is the chosen Azure hosting platform for the environment

### 8.5 Infrastructure as Code

- Bicep or Terraform
- Infrastructure definitions should cover hosting, storage, identity integration, monitoring, secrets, and messaging where applicable

---

## 9. Observability & Monitoring

### 9.1 Logging

- Centralized application and infrastructure logging through Azure Monitor and Application Insights
- Logs should include tenant context where safe and appropriate

### 9.2 Metrics

- API latency
- Error rates
- Throughput
- Queue and background job health
- Tenant-level usage and operational trends
- AI moderation precision proxies such as invalid-rate trend, manual-review rate, and override rate

### 9.3 Alerts

- Threshold-based alerts
- Incident notifications
- Health alerts for deployment, messaging, storage, and authentication dependencies

### 9.4 Auditing

- Track administrative actions
- Track tenant configuration changes
- Track key report lifecycle transitions

---

## 10. Scalability & Performance

### 10.1 Scaling Strategy

- Keep the application stateless where practical
- Scale the app tier horizontally
- Separate background processing into a dedicated worker process if asynchronous load grows significantly
- Revisit service extraction only when there is a demonstrated bottleneck or strong organizational need

### 10.2 Performance Optimization

- Efficient indexing for tenant and geospatial queries
- Response caching where appropriate
- CDN or edge caching for static assets in later phases
- Batch and async processing for expensive non-interactive operations

### 10.3 Service Extraction Criteria

Any move from modular monolith to microservice should require clear justification such as:

- sustained scaling asymmetry for a single module
- independent release cadence needs
- security or compliance isolation needs
- team structure that benefits from hard deployment separation

---

## 11. Fault Tolerance & Resilience

- Retry mechanisms for transient failures
- Idempotent background job handling where feasible
- Graceful degradation when non-core features fail
- Dead-letter handling for durable asynchronous workflows
- Backup, restore, and recovery planning for tenant data and attachments

---

## 12. Integrations

- Map Services such as Azure Maps
- Email providers and future SMS/push providers
- Government systems in later phases
- AI services for duplicate detection, text analysis, and image classification in later phases

---

## 13. Technology Stack

| Layer                    | Technology |
| ------------------------ | -------------------------------------------------------------- |
| Frontend                 | Next.js 16.x / React 19                                                   |
| CSS Framework                 | Tailwind CSS v4 with ShadCN UI                                                   |
| Backend                  | Node.js 22 LTS modular monolith; NestJS 11.x preferred         |
| Application Architecture | Modular monolith                                               |
| Database                 | Azure Database for PostgreSQL Flexible Server (PostgreSQL 16)  |
| ORM | Prisma ORM for database connection and interaction                                               |
| Geospatial               | PostGIS 3.4+                                                   |
| File Storage             | Azure Blob Storage                                             |
| Cache                    | Azure Cache for Redis 7.x (optional)                           |
| Messaging                | Azure Service Bus (optional, workflow-dependent)               |
| Search                   | PostgreSQL 16 indexing and full-text first, Azure AI Search later |
| AI Validation            | Rule-based checks plus Azure AI services where justified       |
| Auth                     | First-party email-and-password authentication with secure session or token handling; extensible to OAuth 2.0 / OpenID Connect later |
| Hosting                  | Azure App Service by default; Container Apps optional          |
| Observability            | Azure Monitor + Application Insights                           |
| Secrets                  | Azure Key Vault                                                |
| CI/CD                    | GitHub Actions; official actions pinned to current stable major versions such as v4 where applicable |

Managed Azure platform services in this table are listed without version numbers where they do not expose a single application-level version that CityOps directly controls.

---

## 14. Risks & Mitigations

| Risk                                | Mitigation                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Tenant isolation defects            | Enforce tenant context in middleware, services, repositories, database policies, and tests |
| Noisy-neighbor performance reports   | Monitor tenant load, partition carefully, and provide future isolation tiers               |
| Over-customization by tenants       | Use controlled configuration models and platform guardrails                                |
| Poor relational schema evolution    | Use disciplined migrations, schema review, and backward-compatible rollout patterns        |
| Geospatial query complexity         | Use PostGIS, targeted indexes, and realistic test data for query tuning                    |
| AI moderation errors                | Use human review paths, threshold tuning, auditing, and per-tenant moderation controls     |
| Premature infrastructure complexity | Default to App Service and modular monolith before considering AKS or microservices        |
| Duplicate detection accuracy        | Start with rule-based and geospatial logic, then improve incrementally with AI             |

---

## 15. Future Enhancements

- Real-time updates with WebSockets or SignalR-compatible patterns
- Advanced AI models for duplicate detection and classification
- Smarter image verification, spam filtering, and abuse detection models
- Azure AI Search for richer discovery scenarios
- Tenant premium isolation models
- Dedicated worker services for heavy asynchronous workloads
- Selective module extraction into independent services if justified

---
