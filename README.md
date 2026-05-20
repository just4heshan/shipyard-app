# Shipyard

A full-stack project management SaaS built as a Turborepo monorepo. Teams can create organisations, manage projects on a Kanban board, collaborate in real time, and subscribe to paid plans via Stripe.

## Demo

**Live:** https://shipyard-app-web.vercel.app

Sign in using **email/password** with any account below — all share the same password. (Using "Sign in with GitHub/Google" creates a new empty account and bypasses the demo data.)

**Password for all accounts:** `Demo1234!`

### Horizon Labs — PRO tier

| Name | Email | Role |
|---|---|---|
| Jordan Rivera | jordan@horizon-labs.io | Owner |
| Alice Chen | alice@horizon-labs.io | Admin |
| Bob Martin | bob@horizon-labs.io | Member |
| Carol Lee | carol@horizon-labs.io | Viewer |

Horizon Labs has 5 projects (3 active, 1 completed, 1 archived), 2 teams, a full Kanban board with tasks, comments, and an activity log spanning 90 days.

### Reef Digital — FREE tier

| Name | Email | Role |
|---|---|---|
| Jordan Rivera | jordan@horizon-labs.io | Owner |

Reef Digital is a single-owner FREE tier org with 1 active project demonstrating plan-level feature gating.

### Stripe test billing

The billing flow runs in Stripe **test mode**. To test upgrading a plan use card number `4242 4242 4242 4242` with any future expiry and any CVC.

## Apps and packages

### Apps

| App           | Package name       | Description                                                         |
| ------------- | ------------------ | ------------------------------------------------------------------- |
| `apps/web`    | `@shipyard/web`    | Next.js 15 web application — auth, dashboard, Kanban board, billing |
| `apps/socket` | `@shipyard/socket` | Express + Socket.io server — real-time task and presence events     |

### Packages

| Package                      | Name                          | Description                                                  |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `packages/api`               | `@shipyard/api`               | tRPC routers, procedures, and all server-side business logic |
| `packages/db`                | `@shipyard/db`                | Prisma client, multi-file schema, and database migrations    |
| `packages/email`             | `@shipyard/email`             | React Email templates and Resend sending helper              |
| `packages/logger`            | `@shipyard/logger`            | Shared tslog logger instance                                 |
| `packages/types`             | `@shipyard/types`             | Shared TypeScript types and interfaces                       |
| `packages/ui`                | `@shipyard/ui`                | Component library — Radix UI + shadcn/ui, Tailwind CSS       |
| `packages/testing`           | `@shipyard/testing`           | Vitest config and shared test factories                      |
| `packages/typescript-config` | `@shipyard/typescript-config` | Shared `tsconfig.json` bases                                 |

## Tech stack

- **Framework** — Next.js 15, React 19
- **API** — tRPC 11 with React Query
- **Database** — PostgreSQL 18 via Prisma 7
- **Auth** — NextAuth.js v5 (Google, GitHub OAuth + email/password)
- **Real-time** — Socket.io
- **Styling** — Tailwind CSS 4, shadcn/ui, Radix UI
- **Payments** — Stripe
- **Email** — React Email + Resend
- **State** — Zustand
- **Linting/Formatting** — Biome
- **Package manager** — Yarn 4 (Berry)

## Prerequisites

- Node.js ≥ 22
- Yarn 4 (`corepack enable`)
- Docker (for PostgreSQL and MailHog in development)

## Getting started

### 1. Install dependencies

```sh
yarn install
```

### 2. Set up environment variables

Copy the example files and fill in values:

```sh
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp packages/db/.env.example packages/db/.env
cp apps/socket/.env.example apps/socket/.env
```

### 3. Start infrastructure

```sh
docker compose up -d
```

This starts:

- **PostgreSQL 18** on port `5432`
- **MailHog** SMTP on port `1025`, web UI on port `8025`


### 4. Run database migrations

```sh
yarn workspace @shipyard/db prisma migrate dev
```

### 5. Start the development servers

```sh
yarn dev
```

This runs `web` (port 3000) and `socket` in parallel via Turborepo.

## Common commands

```sh
# Development
yarn dev                          # Start all apps
yarn workspace @shipyard/web dev  # Start only the web app

# Building
yarn build                        # Build all packages and apps

# Type checking
yarn check-types

# Linting / formatting
yarn lint
yarn format

# Testing
yarn test                         # Run all unit tests
yarn workspace @shipyard/api test # Run API unit tests only
yarn workspace @shipyard/web test # Run web unit tests only

# Database
yarn workspace @shipyard/db prisma migrate dev    # Apply migrations
yarn workspace @shipyard/db prisma studio         # Open Prisma Studio
yarn workspace @shipyard/db prisma generate       # Regenerate client after schema changes
```

## Project structure

```
shipyard/
├── apps/
│   ├── web/          # Next.js application
│   └── socket/       # Socket.io server
├── packages/
│   ├── api/          # tRPC routers and business logic
│   ├── db/           # Prisma schema and client
│   ├── email/        # Email templates
│   ├── logger/       # Shared logger
│   ├── types/        # Shared types
│   ├── ui/           # Component library
│   ├── testing/      # Test utilities
│   └── typescript-config/
├── docker-compose.yml
├── turbo.json
└── package.json
```
