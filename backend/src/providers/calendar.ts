//
// calendar.ts
//
// Google Calendar provider: reads the user's events for "today" in their local
// timezone via the Calendar API. Real client code — needs only a linked Google
// account with the calendar.readonly scope.
//

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { CalendarEventSignal } from "./types.js";
import { dayBoundsInTimezone } from "../lib/time.js";

/**
 * Fetch today's events for the user in `timezone`. `auth` is an OAuth2 client
 * already authorized for the user (see auth/google.ts getAuthedClientForUser).
 */
export async function fetchTodayEvents(
  auth: OAuth2Client,
  timezone: string,
  now: Date = new Date(),
): Promise<CalendarEventSignal[]> {
  const calendar = google.calendar({ version: "v3", auth });
  const { start, end } = dayBoundsInTimezone(now, timezone);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true, // expand recurring events into instances
    orderBy: "startTime",
    maxResults: 25,
  });

  const items = res.data.items ?? [];
  const events: CalendarEventSignal[] = [];

  for (const ev of items) {
    // Skip all-day events without a time and declined events.
    const startStr = ev.start?.dateTime;
    const endStr = ev.end?.dateTime;
    if (!startStr || !endStr) continue;
    if (ev.status === "cancelled") continue;
    const selfDeclined = ev.attendees?.some(
      (a) => a.self && a.responseStatus === "declined",
    );
    if (selfDeclined) continue;

    events.push({
      id: ev.id ?? cryptoRandom(),
      title: ev.summary ?? "(no title)",
      start: new Date(startStr),
      end: new Date(endStr),
      attendees: (ev.attendees ?? [])
        .filter((a) => !a.self && (a.displayName || a.email))
        .map((a) => firstName(a.displayName ?? a.email ?? "")),
      location: ev.location ?? null,
    });
  }

  return events;
}

function firstName(nameOrEmail: string): string {
  // "Henri Dupont" → "Henri"; "henri@x.com" → "henri".
  const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0]! : nameOrEmail;
  return base.split(/[\s.]/)[0] || base;
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2);
}
