# Prerequisites

Before you start the workshop exercises, you need to get the CityOps application running locally and verify that all required tools are in place.

## What You'll Need

- [ ] A GitHub account with an active **Copilot Pro, Pro+, Business, or Enterprise** subscription
- [ ] **VS Code** with the [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) and [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extensions _(local only — Codespace includes VS Code in the browser)_
- [ ] **Node.js 20+** — verify with `node --version` _(local only — pre-installed in Codespace)_
- [ ] **Git** — verify with `git --version` _(local only — pre-installed in Codespace)_
- [ ] **Docker Desktop** — for PostgreSQL (with PostGIS) and Mailpit _(local only — Docker is available inside a Codespace)_
- [ ] An **Azure account** with an Azure OpenAI resource (`gpt-4o` deployed) — optional; only needed for AI image validation. Free trial at [azure.microsoft.com/free](https://azure.microsoft.com/free)

## Step 1 — Fork the Repository

1. Navigate to [https://github.com/prasadhonrao/real-world-ai-development-with-ghcp-workshop](https://github.com/prasadhonrao/real-world-ai-development-with-ghcp-workshop)
2. Click **Fork** to create your own copy under your GitHub account or organisation.

Make a note of your fork URL (`https://github.com/<your-username>/real-world-ai-development-with-ghcp-workshop`) — you'll use it throughout the workshop.

## Step 2 — Choose Your Development Environment

### Option A: Create a Codespace (recommended)

[GitHub Codespaces][codespaces] provides a fully-featured cloud development environment in your browser — no local installs required. VS Code, Node.js, Git, and Docker are all available out of the box.

1. Navigate to your forked repository.
2. Select the green **Code** button.
3. Select the **Codespaces** tab and click **+** to create a new Codespace.

The Codespace will be ready in a minute or two. Once open, continue from **Step 3** below — run all commands in the integrated terminal.

> [!TIP]
> The Codespace keeps your environment consistent and avoids any local configuration issues. It is the recommended choice for workshop events.

### Option B: Clone Locally

If you prefer to work on your own machine, clone your fork and open it in VS Code:

```bash
git clone https://github.com/<your-username>/real-world-ai-development-with-ghcp-workshop.git
cd real-world-ai-development-with-ghcp-workshop
code .
```

Ensure **Docker Desktop** is running before proceeding — it is required for the database and email containers in the steps below.

## Step 3 — Install Dependencies

```bash
npm install
```

This also runs `prisma generate` via the `postinstall` script, generating the Prisma client into `src/generated/prisma/`.

## Step 4 — Start the Database

Start a local PostgreSQL container with PostGIS:

```bash
docker run -d --name cityops-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cityops postgis/postgis:16-3.4
```

Verify it's running:

```bash
docker ps | grep cityops-db
```

## Step 5 — Start Mailpit for Email Testing

The app sends emails for registration, password reset, and status change notifications. Mailpit captures them locally so you can verify email flows without a real mail server:

```bash
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
```

Verify it's running:

```bash
docker ps | grep mailpit
```

Open [http://localhost:8025](http://localhost:8025) to view captured emails.

## Step 6 — Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Generate a secure `AUTH_SECRET` and write it directly into `.env`:

```bash
npx auth secret
```

> [!NOTE]
> This appends `AUTH_SECRET` to your `.env` automatically. If you prefer to do it manually, run `openssl rand -base64 32` and paste the output as the value.

Open `.env` and confirm the remaining required values are set:

```env
# Required — local Docker Postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cityops"

# Set by npx auth secret above
AUTH_SECRET="<generated>"

# Required — set to your local URL during development
NEXTAUTH_URL="http://localhost:3000"

# Mailpit SMTP (matches the Docker container started in Step 4)
SMTP_HOST=localhost
SMTP_PORT=1025
```

> [!TIP]
> Azure OpenAI configuration (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`) is optional — only required for the AI image validation feature. The app skips that step gracefully if these values are not set.
>
> To create an Azure OpenAI resource and deploy a `gpt-4o` model, follow the [Create an Azure OpenAI resource](https://learn.microsoft.com/en-us/microsoft-cloud/dev/tutorials/openai-acs-msgraph/02-openai-create-resource) guide. You will need an Azure subscription — a free trial is available at [azure.microsoft.com/free](https://azure.microsoft.com/free).

## Step 7 — Run Database Migrations and Seed Data

Apply the Prisma schema to your database:

```bash
npm run db:migrate:deploy
```

Seed sample data (4 councils, 33 users, 32 reports):

```bash
npm run db:seed
```

> [!NOTE]
> The seed is idempotent — safe to run multiple times. It creates deterministic UUIDs so records are never duplicated.

## Step 8 — Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and verify:

- The homepage loads with the hero section and recent reports
- The national map at `/map` shows report pins
- The dashboard at `/dashboard` shows KPI cards and charts

You should see a homepage similar to this:

![CityOps homepage](../images/home-page.png)

## Step 9 — Explore the Project Structure

Before moving to Module 01, take 5 minutes to browse the key areas of the codebase:

| Path                              | What it contains                                          |
| --------------------------------- | --------------------------------------------------------- |
| `prisma/schema.prisma`            | Full data model — 24 models, 11 enums                     |
| `src/app/`                        | Next.js App Router pages and layouts                      |
| `src/components/`                 | Shared React components                                   |
| `src/lib/`                        | Server-side utilities (Prisma client, Auth.js, AI, email) |
| `src/types/`                      | Shared TypeScript types                                   |
| `.github/copilot-instructions.md` | Repository-wide Copilot instructions                      |
| `.github/instructions/`           | Task-specific instruction files                           |
| `.github/skills/`                 | Agent skill definitions                                   |

## Summary

You now have CityOps running locally with seed data. In the next module you'll take a tour of the project — the tech stack, key concepts, and a full walkthrough of the app as a citizen and staff member.

## Resources

- [GitHub Codespaces overview][codespaces]
- [Getting started with Codespaces](https://docs.github.com/codespaces/getting-started/quickstart)
- [Docker Desktop download](https://www.docker.com/products/docker-desktop/)
- [Prisma documentation](https://www.prisma.io/docs)
- [Auth.js (NextAuth v5) documentation](https://authjs.dev)

[codespaces]: https://github.com/features/codespaces
