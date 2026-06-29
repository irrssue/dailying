//
// scheduler.ts
//
// Registers the repeatable "sweep" job on the cron from env. Idempotent:
// re-running upserts the same repeatable, so it's safe to call on every boot.
//

import { briefingQueue } from "./queue.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const SWEEP_JOB_NAME = "sweep";

export async function scheduleSweep(): Promise<void> {
  // Remove any prior repeatables for the sweep so a changed cron takes effect.
  const repeatables = await briefingQueue.getRepeatableJobs();
  for (const r of repeatables) {
    if (r.name === SWEEP_JOB_NAME) {
      await briefingQueue.removeRepeatableByKey(r.key);
    }
  }

  await briefingQueue.add(
    SWEEP_JOB_NAME,
    { type: "sweep" },
    { repeat: { pattern: env.BRIEFING_CRON }, jobId: "sweep" },
  );
  logger.info({ cron: env.BRIEFING_CRON }, "briefing sweep scheduled");
}
