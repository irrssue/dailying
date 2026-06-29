//
// server.ts
//
// API entrypoint. Builds the app, binds the port, and registers the repeatable
// briefing sweep so a fresh deploy schedules itself. The actual job *processing*
// lives in the worker (npm run worker) — keep API and worker as separate
// processes so heavy Claude calls never block request handling.
//

import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { scheduleSweep } from "./jobs/scheduler.js";
import { disconnectPrisma } from "./db/prisma.js";
import { logger } from "./lib/logger.js";

async function main(): Promise<void> {
  const app = await buildApp();

  // Ensure the nightly sweep is scheduled (idempotent). The worker also calls
  // this on its own boot; doing it here means it's set even if the API starts
  // first.
  await scheduleSweep();

  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(`API listening on http://${env.HOST}:${env.PORT}`);

  const shutdown = async (sig: string) => {
    logger.info({ sig }, "shutting down API");
    await app.close();
    await disconnectPrisma();
    process.exit(0);
  };
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => void shutdown(sig));
  }
}

main().catch((err) => {
  logger.error({ err }, "failed to start server");
  process.exit(1);
});
