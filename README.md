# hitachi2

A parking reservation system built with a fully type-safe TypeScript monorepo stack.

## Stack

| Layer                     | Tech                              |
| ------------------------- | --------------------------------- |
| Runtime / Package Manager | Bun                               |
| Monorepo                  | Turborepo                         |
| Frontend                  | Next.js 16 + Tailwind + shadcn-ui |
| Backend                   | Fastify                           |
| API                       | **oRPC**                          |
| Auth                      | Better Auth                       |
| ORM                       | Prisma                            |
| Database                  | PostgreSQL                        |
| Job Queue                 | pg-boss                           |
| Validation                | Zod                               |

## Project structure

```
hitachi2/
├── apps/
│   ├── web/          # Next.js frontend (port 3001)
│   └── server/       # Fastify backend (port 3000)
├── packages/
│   ├── api/          # oRPC routers and procedures
│   ├── auth/         # Better Auth configuration
│   ├── db/           # Prisma schema + client
│   ├── env/          # Validated environment variables (server + web)
│   └── config/        # Shared TypeScript config
└── docker-compose.yml
```

### apps/web

The oRPC client (`src/utils/orpc.ts`) is integrated with TanStack Query via `@orpc/tanstack-query`, giving typed `.queryOptions()` and `.mutationOptions()` for every procedure.

### apps/server

Fastify server that mounts three things:

- `POST /rpc/*` — oRPC handler (all API calls)
- `/api/auth/*` — Better Auth handler (session, sign in/out)
- `/api-reference/*` — auto-generated OpenAPI docs (via `@orpc/openapi`)

### packages/api

All oRPC procedure definitions. Structure follows a modules pattern:

```
packages/api/src/
├── index.ts            # publicProcedure + protectedProcedure (auth middleware)
├── context.ts          # per-request context: { session, jobQueue }
└── routers/
    └── modules/
        └── parking-reservation/
            ├── router.ts          # procedure definitions
            ├── application/       # business logic
            ├── domain/            # domain error classes
            └── infrastructure/    # Prisma (orm) calls
```

## What is oRPC and why it's used

[oRPC](https://orpc.unnoq.com) is a lightweight RPC framework for TypeScript. It sits between the frontend and backend and provides end-to-end type safety without a separate schema language or code generation step.

**How it works here:**

1. Procedures are defined in `packages/api` using a builder pattern:
   ```ts
   const reserveParkingSpot = publicProcedure
     .input(z.object({ date: z.string(), carId: z.string() }))
     .handler(async ({ input, context }) => { ... });
   ```

2. The router type is exported and imported by the client — no codegen, just TypeScript:
   ```ts
   // apps/web/src/utils/orpc.ts
   import type { router } from "@hitachi2/api";
   const client = createORPCClient<typeof router>(link);
   ```

3. On the frontend, `@orpc/tanstack-query` wraps the client into React Query hooks:
   ```ts
   const { data } = useQuery(orpc.healthCheck.queryOptions());
   const mutation = useMutation(orpc.reserveParkingSpot.mutationOptions());
   ```

**Why oRPC instead of REST or tRPC:**

- **vs REST**: No manual type syncing between OpenAPI spec and TypeScript types. Input validation (Zod) is the single source of truth for both runtime checks and types.
- **vs tRPC**: oRPC natively emits a standard OpenAPI schema (`/api-reference`) usable by any HTTP client or documentation tool — no lock-in. It also works cleanly with any HTTP framework (Fastify here) without adapter gymnastics.
- **Result**: the compiler catches mismatches between what the server returns and what the frontend consumes, across the monorepo, at build time.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- Docker (for PostgreSQL)

### Setup

```bash
# Start the database
docker compose up -d

# Install dependencies
bun install

# Push schema and seed
bun db:generate
bun db:push
bun db:seed

# Start everything
bun dev
```

- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- API docs: http://localhost:3000/api-reference

### Useful commands

```bash
bun build          # Production build
bun test           # Run tests
bun db:studio      # Open Prisma Studio
```

## Environment variables

Validated at startup via `packages/env`.

**Server** (`.env` in `apps/server`):
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/hitachi2
BETTER_AUTH_SECRET=<secret>
CORS_ORIGIN=http://localhost:3001
```

**Web** (`.env.local` in `apps/web`):
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```
