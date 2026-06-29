//
// reminders.ts
//
// Reminders provider. Google has no public "Reminders" API; the closest is the
// Google Tasks API. This adapter reads tasks due today/overdue from the user's
// default task list. If you'd rather source reminders from Apple on-device,
// have the app POST them up and feed them into the pipeline instead — the
// pipeline only cares about ReminderSignal[].
//
// Tasks API uses the same OAuth client; add the scope
//   https://www.googleapis.com/auth/tasks.readonly
// to GOOGLE_SCOPES if you enable this path. It's left OUT of the default scope
// set so the consent screen stays minimal until you opt in.
//
// TODO(liam): enable the Google Tasks API in Cloud Console and add the
// tasks.readonly scope, OR wire Apple Reminders from the app. Until then this
// returns [] and the briefing simply has no reminders card.
//

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { ReminderSignal } from "./types.js";
import { logger } from "../lib/logger.js";

/**
 * Fetch reminders/tasks due today or overdue. Returns [] on any error (or when
 * the Tasks scope isn't granted) so reminders never block the briefing.
 */
export async function fetchDueReminders(
  auth: OAuth2Client,
  now: Date = new Date(),
): Promise<ReminderSignal[]> {
  try {
    const tasksApi = google.tasks({ version: "v1", auth });
    const lists = await tasksApi.tasklists.list({ maxResults: 1 });
    const listId = lists.data.items?.[0]?.id;
    if (!listId) return [];

    const res = await tasksApi.tasks.list({
      tasklist: listId,
      showCompleted: false,
      dueMax: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 10,
    });

    return (res.data.items ?? [])
      .filter((t) => t.title)
      .map((t) => ({
        id: t.id ?? Math.random().toString(36).slice(2),
        title: t.title!,
        due: t.due ? new Date(t.due) : null,
        deepLink: "x-apple-reminderkit://",
      }));
  } catch (err) {
    // Most commonly: tasks.readonly scope not granted. Soft-fail.
    logger.debug({ err }, "reminders fetch skipped");
    return [];
  }
}
