FROM oven/bun:1 AS pruner
WORKDIR /app

RUN bun add -g turbo

COPY . .

RUN turbo prune server --docker

FROM oven/bun:1 AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .

RUN bun ci --ignore-scripts

COPY --from=pruner /app/out/full/ .

ENV DATABASE_URL="postgresql://postgres:password@db:5432/hitachi2"
RUN cd packages/db && bunx prisma generate --schema=prisma/schema

WORKDIR /app/apps/server
RUN bun run build
WORKDIR /app

FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=installer /app/apps/server/dist ./dist
COPY --from=installer /app/packages/db/prisma ./packages/db/prisma
COPY --from=installer /app/packages/db/prisma.config.ts ./packages/db/prisma.config.ts
COPY --from=installer /app/package.json ./package.json
COPY --from=installer /app/node_modules ./node_modules

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
CMD ["bun", "run", "./dist/index.mjs"]
