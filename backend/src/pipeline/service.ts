//
// service.ts
//
// The end-to-end "make a briefing" operation, used by both the on-demand route
// and the nightly job:
//
//   gatherSignals → buildBriefing (Claude) → persist → return as DTO
//
// Persistence is idempotent per (user, local day): generating twice in one day
// upserts the same row. Reads (getTodayBriefing) hand back the stored DTO so
// the app gets an identical shape whether it was just generated or cached.
//

import type { User } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { gatherSignals } from "../providers/index.js";
import { buildBriefing } from "./pipeline.js";
import { localDateKey } from "../lib/time.js";
import type {
  BriefingDTO,
  BriefingCardDTO,
  CalendarBlockDTO,
} from "../types/briefing.js";
import { logger } from "../lib/logger.js";

/**
 * Generate (or regenerate) today's briefing for a user and persist it.
 * Returns the DTO ready to serve.
 */
export async function generateAndStoreBriefing(
  user: Pick<User, "id" | "name" | "timezone" | "newsEnabled" | "streakDays">,
  now: Date = new Date(),
): Promise<BriefingDTO> {
  const forDate = localDateKey(now, user.timezone);

  const signals = await gatherSignals(user, now);
  const dto = await buildBriefing({
    user,
    signals,
    streakDays: user.streakDays,
    now,
  });

  await persist(user.id, forDate, dto);
  logger.info({ userId: user.id, forDate, cards: dto.cards.length }, "briefing generated");
  return dto;
}

/**
 * Return today's stored briefing for a user, or null if none has been generated
 * yet for the local day.
 */
export async function getStoredTodayBriefing(
  user: Pick<User, "id" | "timezone" | "streakDays">,
  now: Date = new Date(),
): Promise<BriefingDTO | null> {
  const forDate = localDateKey(now, user.timezone);
  const row = await prisma.briefing.findUnique({
    where: { userId_forDate: { userId: user.id, forDate } },
    include: { cards: { include: { blocks: true }, orderBy: { position: "asc" } } },
  });
  if (!row) return null;

  return {
    generatedAt: row.generatedAt.toISOString(),
    streakDays: row.streakDays,
    cards: row.cards.map(toCardDTO),
  };
}

/** Upsert the briefing + cards + blocks for (user, day). */
async function persist(userId: string, forDate: string, dto: BriefingDTO): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Replace any existing briefing for this day (cards cascade-delete).
    const existing = await tx.briefing.findUnique({
      where: { userId_forDate: { userId, forDate } },
    });
    if (existing) {
      await tx.briefing.delete({ where: { id: existing.id } });
    }

    await tx.briefing.create({
      data: {
        userId,
        forDate,
        generatedAt: new Date(dto.generatedAt),
        streakDays: dto.streakDays,
        cards: {
          create: dto.cards.map((c, i) => ({
            category: c.category,
            body: c.body,
            deepLink: c.deepLink,
            position: i,
            blocks: {
              create: (c.timeline ?? []).map((b) => ({
                title: b.title,
                start: new Date(b.start),
                end: new Date(b.end),
                accentName: b.accentName,
              })),
            },
          })),
        },
      },
    });
  });
}

type CardWithBlocks = {
  id: string;
  category: string;
  body: string;
  deepLink: string | null;
  blocks: Array<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    accentName: string;
  }>;
};

function toCardDTO(c: CardWithBlocks): BriefingCardDTO {
  const timeline: CalendarBlockDTO[] | null =
    c.category === "today"
      ? c.blocks.map((b) => ({
          id: b.id,
          title: b.title,
          start: b.start.toISOString(),
          end: b.end.toISOString(),
          accentName: b.accentName as CalendarBlockDTO["accentName"],
        }))
      : null;

  return {
    id: c.id,
    category: c.category as BriefingCardDTO["category"],
    body: c.body,
    deepLink: c.deepLink,
    timeline,
  };
}
