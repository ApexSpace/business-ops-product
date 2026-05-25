# Backend API

NestJS API for the Business Automation Application — a **domain-agnostic** foundation you can extend with product modules. Use this as the starting point for any product — add feature modules under `src/modules/` as your domain grows.

## Stack

- **NestJS 11** — modular architecture
- **PostgreSQL** — your own local or hosted instance
- **Prisma 7** — ORM and migrations
- **pnpm** — package manager
- **Swagger** — OpenAPI at `/docs`
- **Joi** — environment validation at startup

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (or `npx pnpm@latest` for commands)
- PostgreSQL running and reachable via `DATABASE_URL`

## Quick start

```bash
cp .env.example .env
# Edit DATABASE_URL to match your PostgreSQL instance

pnpm install
pnpm db:migrate:deploy
pnpm start:dev
```

- API base: `http://localhost:3000/api/v1`
- Health: `GET http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs`

## Project structure

```
src/
├── config/           # Env config + Joi validation
├── common/           # Filters, interceptors, DTOs, decorators (no DB)
├── core/             # Global infrastructure (Prisma, health)
├── modules/          # Feature modules (one folder per domain)
├── app.module.ts     # Composition root
└── main.ts           # Bootstrap, Swagger, global pipes
```

### Conventions

| Rule | Detail |
|------|--------|
| Feature modules | `src/modules/<name>/` with layered folders (see below) |
| Prisma access | **Only in `repositories/`** — services orchestrate; controllers use DTOs |
| DTOs vs models | API DTOs use `class-validator`; DB models live in `prisma/schema.prisma` |
| Core vs common | **Core** = singletons (DB, health). **Common** = guards, decorators, filters |

### Feature module layout

```
src/modules/<feature>/
  <feature>.module.ts
  controllers/       # HTTP only
  services/          # business logic
  repositories/      # Prisma queries only
  dto/
  guards/            # optional, module-specific
  strategies/        # auth only (Passport)
  mappers/           # optional
```

Shared JWT and role guards live in `src/common/guards/`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Dev server with watch |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Create/apply migrations (interactive dev) |
| `pnpm db:migrate:deploy` | Apply pending migrations |
| `pnpm db:push` | Push schema without migration files (prototyping only) |
| `pnpm db:studio` | Prisma Studio GUI |
| `pnpm db:seed` | Run seed script |

## Adding a feature module

1. Create `src/modules/<feature>/` using the layered layout above.
2. Add Prisma models in `prisma/schema.prisma`, then `pnpm db:migrate`.
3. Import the module in `src/app.module.ts`.
4. Put Prisma access in `repositories/`; inject repositories into `services/`.

## Auth & multi-tenancy

- **Auth:** `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/switch-context`, `GET /auth/me`
- **Platform:** `/platform/businesses`, `/platform/businesses/:id/members`, audit logs
- **Business context:** `/businesses/current`, `/businesses/current/members`
- Seed super admin: `pnpm db:seed` (see `.env.example` for `SEED_*` and `JWT_*` vars)

## Adding a Prisma model

```prisma
// prisma/schema.prisma
model YourModel {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```bash
pnpm db:migrate
```

## Environment variables

See [`.env.example`](.env.example). The app fails fast on startup if required variables are missing or invalid.

## What is not included (add later)

- Email delivery (invite links are returned in API responses)
- Redis, queues
- CI/CD pipelines

## License

UNLICENSED — private project
