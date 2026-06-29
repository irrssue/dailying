# Production image for both the API and the worker. The CMD differs per process:
#   API:    node dist/server.js   (default)
#   Worker: node dist/jobs/worker.js
# In your orchestrator, override the command for the worker deployment.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.js"]
