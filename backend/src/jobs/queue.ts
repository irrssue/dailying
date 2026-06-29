//
// queue.ts
//
// BullMQ queues. Two jobs:
//   • "sweep"     — the scheduled fan-out: enqueue a generate job per user.
//   • "generate"  — build + store one user's briefing.
//
// The sweep runs on a cron (BRIEFING_CRON) via a repeatable job. Splitting
// sweep from generate means one slow/failing user doesn't hold up the rest and
// each user's generation retries independently.
//

import { Queue } from "bullmq";
import { bullConnectionOptions } from "../db/redis.js";

export const BRIEFING_QUEUE = "briefing";

export interface SweepJobData {
  type: "sweep";
}
export interface GenerateJobData {
  type: "generate";
  userId: string;
}
export type BriefingJobData = SweepJobData | GenerateJobData;

/** Job names used on this queue. */
export type BriefingJobName = "sweep" | "generate";

// Queue uses its own Redis connection (BullMQ builds it from these options).
export const briefingQueue = new Queue<BriefingJobData, void, BriefingJobName>(
  BRIEFING_QUEUE,
  {
    connection: bullConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  },
);

/** Enqueue a one-off generate job (also used by the on-demand path if desired). */
export async function enqueueGenerate(userId: string): Promise<void> {
  await briefingQueue.add(
    "generate",
    { type: "generate", userId },
    // Dedupe: at most one pending generate per user.
    { jobId: `generate:${userId}` },
  );
}
