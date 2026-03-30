FROM oven/bun:1-slim AS pruner
WORKDIR /app

RUN bun add -g turbo

COPY . .

RUN turbo prune web --docker

FROM oven/bun:1-slim AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .

RUN bun ci --ignore-scripts

COPY --from=pruner /app/out/full/ .

ENV DATABASE_URL="postgresql://postgres:password@db:5432/hitachi2"
RUN cd packages/db && bunx prisma generate --schema=prisma/schema

FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY --from=installer /app/ .
COPY --from=installer /app/packages/db/prisma ./packages/db/prisma

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL:-http://localhost:3001}

RUN bun run build --filter=web

FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && \
  useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun --eval "fetch('http://localhost:3000').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENV HOSTNAME=0.0.0.0
CMD ["bun", "run", "apps/web/server.js"]
