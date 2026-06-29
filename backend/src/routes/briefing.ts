//
// briefing.ts
//
// The route the app hits on launch:
//
//   GET /briefing/today        → today's briefing (BriefingDTO).
//                                Returns the stored briefing if one exists for
//                                the user's local day; otherwise generates one
//                                on demand. `?refresh=1` forces regeneration.
//                                Also bumps the open-streak.
//
// The response shape is exactly what dailying/Models/Briefing.swift decodes.
//

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import {
  generateAndStoreBriefing,
  getStoredTodayBriefing,
} from "../pipeline/service.js";
import { bumpStreak } from "../lib/streak.js";
import { UnauthorizedError } from "../lib/errors.js";

export async function briefingRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/briefing/today",
    { preHandler: [app.authenticate] },
    async (req) => {
      const query = z
        .object({ refresh: z.coerce.boolean().optional() })
        .parse(req.query);

      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      if (!user) throw new UnauthorizedError();

      // Opening the briefing counts toward the streak (once per local day).
      const streakDays = await bumpStreak(user);

      const reload = { ...user, streakDays };

      if (!query.refresh) {
        const stored = await getStoredTodayBriefing(reload);
        if (stored) {
          // Keep the streak fresh on the served copy.
          return { ...stored, streakDays };
        }
      }

      // Generate on demand (first open of the day, or forced refresh).
      return generateAndStoreBriefing(reload);
    },
  );
}
