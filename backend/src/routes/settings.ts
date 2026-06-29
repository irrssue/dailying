//
// settings.ts
//
// Settings routes backing the app's Settings sheet:
//
//   GET   /settings            → current settings.
//   PATCH /settings            → update news opt-in, display name, timezone.
//
// `newsEnabled` here is the server-side source of truth that decides whether
// the news card is generated at all (the app also filters locally, but the
// server respects this so it doesn't fetch news for opted-out users).
//

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { UnauthorizedError } from "../lib/errors.js";

const PatchBody = z.object({
  newsEnabled: z.boolean().optional(),
  name: z.string().trim().max(80).optional(),
  // IANA timezone; validated loosely (full list is large).
  timezone: z.string().min(1).max(64).optional(),
});

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/settings", { preHandler: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) throw new UnauthorizedError();
    return {
      newsEnabled: user.newsEnabled,
      name: user.name,
      timezone: user.timezone,
    };
  });

  app.patch("/settings", { preHandler: [app.authenticate] }, async (req) => {
    const body = PatchBody.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user.sub },
      data: {
        newsEnabled: body.newsEnabled,
        name: body.name,
        timezone: body.timezone,
      },
    });
    return {
      newsEnabled: user.newsEnabled,
      name: user.name,
      timezone: user.timezone,
    };
  });
}
