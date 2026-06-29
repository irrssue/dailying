//
// worker.ts
//
// The BullMQ worker process. Run separately from the API:  npm run worker
//
//   • sweep job    → loads all users with a linked Google account and enqueues
//                    one generate job each.
//   • generate job → builds + stores that user's briefing.
//
// Errors in a generate job bubble up so BullMQ retries with backoff. A user
// whose Google link needs re-consent (ReauthRequiredError) is logged and
// skipped — retrying won't help until they re-auth in the app.
//

import { Worker, type Job } from "bullmq";
import { bullConnectionOptions } from "../db/redis.js";
import {
  BRIEFING_QUEUE,
  enqueueGenerate,
  type BriefingJobData,
  type BriefingJobName,
} from "./queue.js";
import { scheduleSweep } from "./scheduler.js";
import { prisma } from "../db/prisma.js";
import { generateAndStoreBriefing } from "../pipeline/service.js";
import { ReauthRequiredError, ProviderUnconfiguredError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

async function handleSweep(): Promise<void> {
  // Only users with a linked Google account can have a briefing built.
  const users = await prisma.user.findMany({
    where: { oauthAccounts: { some: { provider: "google" } } },
    select: { id: true },
  });
  logger.info({ count: users.length }, "sweep: enqueueing generate jobs");
  for (const u of users) {
    await enqueueGenerate(u.id);
  }
}

async function handleGenerate(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      timezone: true,
      newsEnabled: true,
      streakDays: true,
    },
  });
  if (!user) {
    logger.warn({ userId }, "generate: user not found, skipping");
    return;
  }

  try {
    await generateAndStoreBriefing(user);
  } catch (err) {
    if (err instanceof ReauthRequiredError) {
      // Can't recover without the user re-consenting; don't retry forever.
      logger.warn({ userId }, "generate: reauth required, skipping");
      return;
    }
    if (err instanceof ProviderUnconfiguredError) {
      logger.warn({ userId, err: err.message }, "generate: provider unconfigured, skipping");
      return;
    }
    throw err; // let BullMQ retry transient failures
  }
}

const worker = new Worker<BriefingJobData, void, BriefingJobName>(
  BRIEFING_QUEUE,
  async (job: Job<BriefingJobData, void, BriefingJobName>) => {
    if (job.data.type === "sweep") return handleSweep();
    if (job.data.type === "generate") return handleGenerate(job.data.userId);
  },
  {
    connection: bullConnectionOptions,
    concurrency: 4, // a few users in parallel; Claude calls dominate latency
  },
);

worker.on("completed", (job) => logger.debug({ jobId: job.id }, "job completed"));
worker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err }, "job failed"),
);

// Ensure the repeatable sweep exists whenever the worker starts.
await scheduleSweep();

logger.info("briefing worker started");

// Graceful shutdown.
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    logger.info({ sig }, "shutting down worker");
    await worker.close();
    process.exit(0);
  });
}
