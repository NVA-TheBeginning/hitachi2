FROM oven/bun:1-slim AS pruner
WORKDIR /app

RUN bun add -g turbo

COPY . .

RUN turbo prune server --docker

FROM oven/bun:1-slim AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .

RUN bun ci --ignore-scripts

COPY --from=pruner /app/out/full/ .

ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG CORS_ORIGIN
ARG API_DOMAIN
ARG DATABASE_URL

ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV CORS_ORIGIN=${CORS_ORIGIN}
ENV API_DOMAIN=${API_DOMAIN}
ENV DATABASE_URL=${DATABASE_URL:-postgresql://postgres:password@db:5432/hitachi2}

RUN cd packages/db && bunx prisma generate --schema=prisma/schema

WORKDIR /app/apps/server
RUN bun run build
WORKDIR /app

FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=installer /app/apps/server/server /app/server
COPY --from=installer /app/packages/db/prisma/schema /app/packages/db/prisma/schema
COPY --from=installer /app/packages/db/prisma /app/packages/db/prisma
COPY --from=installer /app/packages/db/prisma.config.ts /app/packages/db/prisma.config.ts
COPY --from=installer /app/packages/db/package.json /app/packages/db/package.json
COPY --from=installer /app/package.json /app/package.json
COPY --from=installer /app/bun.lock /app/bun.lock

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
CMD ["/app/server"]
