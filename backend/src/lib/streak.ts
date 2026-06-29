//
// streak.ts
//
// Sunrise-ring streak logic. Opening the briefing once per local day extends
// the streak; missing a day resets it to 1. Mirrors the app's "consecutive
// mornings" intent.
//

import type { User } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { localDateKey } from "./time.js";

/**
 * Record that `user` opened their briefing now, updating streakDays. Idempotent
 * within a local day. Returns the new streak count.
 */
export async function bumpStreak(
  user: Pick<User, "id" | "timezone" | "streakDays" | "lastOpenedAt">,
  now: Date = new Date(),
): Promise<number> {
  const today = localDateKey(now, user.timezone);
  const last = user.lastOpenedAt ? localDateKey(user.lastOpenedAt, user.timezone) : null;

  if (last === today) {
    return user.streakDays; // already counted today
  }

  // Was yesterday the last open? Then continue; otherwise reset.
  const yesterday = localDateKey(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
    user.timezone,
  );
  const newStreak = last === yesterday ? user.streakDays + 1 : 1;

  await prisma.user.update({
    where: { id: user.id },
    data: { streakDays: newStreak, lastOpenedAt: now },
  });
  return newStreak;
}
