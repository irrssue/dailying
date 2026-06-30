# Production image for both the API and the worker. The CMD differs per process:
#   API:    node dist/server.js        (default)
#   Worker: node dist/jobs/worker.js
#   Migrate: npx prisma migrate deploy  (use the `migrate` stage below — the
#            runtime stage omits devDeps, so it has no prisma CLI)
# In your orchestrator, override the command per deployment. See
# docker-compose.prod.yml for how the three are wired.

FROM node:22-slim AS build
WORKDIR /app
# node:*-slim ships without OpenSSL; Prisma needs it to pick its query engine
# (otherwise it warns and guesses). ca-certificates is for outbound HTTPS to the
# Google / Anthropic / news APIs.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Migration stage: keeps the full dependency set (incl. the prisma CLI, a
# devDependency) plus the schema, so `prisma migrate deploy` can run on release.
FROM build AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.js"]
