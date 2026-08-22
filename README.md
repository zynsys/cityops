# CityOps

**App:**
[![Build Status](https://dev.azure.com/zynsys/cityops/_apis/build/status%2Fapp-cicd?branchName=main)](https://dev.azure.com/zynsys/cityops/_build/latest?definitionId=22&branchName=main)
[![GitHub Actions](https://github.com/zynsys/cityops/actions/workflows/app-cicd.yml/badge.svg?branch=main)](https://github.com/zynsys/cityops/actions/workflows/app-cicd.yml)

**Infra:**
[![Azure DevOps](https://dev.azure.com/zynsys/cityops/_apis/build/status%2Finfra-cicd?branchName=main)](https://dev.azure.com/zynsys/cityops/_build/latest?definitionId=23&branchName=main)
[![GitHub Actions](https://github.com/zynsys/cityops/actions/workflows/infra-cicd.yml/badge.svg?branch=main)](https://github.com/zynsys/cityops/actions/workflows/infra-cicd.yml)

CityOps is a multi-tenant civic reporting platform for UK citizens and local authorities. Citizens can report public issues, track their progress, and discover nearby reports, while council teams can validate, assign, manage, and resolve them through a tenant-aware operational workspace.

## Key capabilities

- Citizen issue reporting and status tracking
- Council report validation, assignment, and lifecycle management
- Multi-tenant data isolation and configurable authority workspaces
- Role-based access for citizens, authority users, tenant admins, and platform admins
- Map-based discovery and geospatial workflows
- AI-assisted report validation and moderation
- Notifications, analytics, audit history, and file attachments

## Technology

- Next.js 16, React 19, and TypeScript
- Tailwind CSS 4
- PostgreSQL 17 with PostGIS
- Prisma 7
- Auth.js / NextAuth 5
- Azure OpenAI and Azure Blob Storage integrations

CityOps is designed as a modular monolith: one deployable application with clear domain boundaries and tenant-aware access at every layer.

## Getting started

### Prerequisites

- Node.js 20 or later
- npm
- Docker Desktop with Docker Compose

### Local setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/zynsys/cityops.git
   cd cityops
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

   On PowerShell, use `Copy-Item .env.example .env`. Replace `AUTH_SECRET` with a random value of at least 32 characters. The remaining defaults support the local Docker services; Azure settings are only required for the related integrations.

3. Start PostgreSQL/PostGIS and Mailpit:

   ```bash
   docker compose up -d
   ```

4. Apply database migrations and load sample data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) for CityOps. Captured development emails are available in Mailpit at [http://localhost:8025](http://localhost:8025).

## Useful commands

| Command               | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Start the local development server                   |
| `npm run build`       | Generate Prisma Client and create a production build |
| `npm run start`       | Run the production build                             |
| `npm run lint`        | Run ESLint                                           |
| `npm run db:migrate`  | Create and apply local database migrations           |
| `npm run db:seed`     | Load sample data                                     |
| `npm run db:studio`   | Open Prisma Studio                                   |
| `npm run db:validate` | Validate the Prisma schema                           |

## Project documentation

- [Product requirements](docs/product-requirements.md)
- [Technical architecture](docs/technical-architecture.md)
- [Data model](docs/data-model.md)
- [Role-based access control](docs/rbac.md)
