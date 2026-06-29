//
// index.ts
//
// Aggregates all providers into one `gatherSignals(user)` call. This is the
// single seam the pipeline depends on: give it a user, get back every raw
// signal for their morning. Each provider soft-fails independently so one
// flaky source (news, reminders) never sinks the whole briefing.
//

import type { User } from "@prisma/client";
import { getAuthedClientForUser } from "../auth/google.js";
import { fetchTodayEvents } from "./calendar.js";
import { fetchImportantEmails } from "./gmail.js";
import { fetchDueReminders } from "./reminders.js";
import { fetchTopHeadlines } from "./news.js";
import type { BriefingSignals } from "./types.js";
import { newsConfigured } from "../config/env.js";
import { logger } from "../lib/logger.js";

export async function gatherSignals(
  user: Pick<User, "id" | "timezone" | "newsEnabled">,
  now: Date = new Date(),
): Promise<BriefingSignals> {
  const auth = await getAuthedClientForUser(user.id);

  // Calendar + email are the backbone; let them throw (a missing Google link
  // is a real, surfaceable error). Reminders/news are best-effort.
  const [events, emails] = await Promise.all([
    fetchTodayEvents(auth, user.timezone, now),
    fetchImportantEmails(auth),
  ]);

  const reminders = await fetchDueReminders(auth, now).catch((err) => {
    logger.debug({ err }, "reminders soft-failed");
    return [];
  });

  let news: BriefingSignals["news"] = [];
  if (user.newsEnabled && newsConfigured) {
    news = await fetchTopHeadlines().catch((err) => {
      logger.debug({ err }, "news soft-failed");
      return [];
    });
  }

  // TODO(liam): weather isn't wired to a provider yet. The pipeline handles a
  // null weather gracefully (it just omits the weather phrase). Add a weather
  // adapter here when you pick a provider and pass { summary, highC, lowC }.
  return { events, emails, reminders, news, weather: null };
}
