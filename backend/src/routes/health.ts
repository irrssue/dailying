//
// health.ts
//
// Liveness + readiness. /healthz is a plain liveness ping; /readyz checks the
// datastores and reports which credential-gated providers are configured (so
// you can see at a glance what's still on the manual to-do list).
//

import type { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma.js";
import { redis } from "../db/redis.js";
import { anthropicConfigured, googleConfigured, newsConfigured } from "../config/env.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async () => ({ status: "ok" }));

  app.get("/readyz", async (_req, reply) => {
    const checks: Record<string, boolean> = {};
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }
    try {
      await redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }

    const providers = {
      google: googleConfigured,
      anthropic: anthropicConfigured,
      news: newsConfigured,
    };

    const ready = checks.postgres && checks.redis;
    reply.code(ready ? 200 : 503);
    return { ready, checks, providers };
  });
}
