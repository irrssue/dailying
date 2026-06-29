//
// time.ts
//
// Timezone helpers. We work in UTC internally but need to reason about the
// user's *local* day (when is "today", when is "morning") to decide what to
// fetch and which briefing is current.
//

/**
 * The YYYY-MM-DD local-calendar date for `instant` in `timezone`.
 * Used as the `forDate` key on a briefing.
 */
export function localDateKey(instant: Date, timezone: string): string {
  // en-CA gives ISO-ish YYYY-MM-DD.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(instant);
}

/**
 * The UTC instants bounding the local day that contains `instant` in
 * `timezone` — i.e. local 00:00:00 → next local 00:00:00.
 *
 * Implemented by finding the timezone's UTC offset at `instant` and shifting.
 * Good enough for day-window calendar queries (DST edge minutes aside).
 */
export function dayBoundsInTimezone(
  instant: Date,
  timezone: string,
): { start: Date; end: Date } {
  const offsetMs = timezoneOffsetMs(instant, timezone);
  // Local wall-clock time as if it were UTC.
  const localMs = instant.getTime() + offsetMs;
  const local = new Date(localMs);
  const localMidnightMs = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    0,
    0,
    0,
    0,
  );
  // Convert that local-midnight wall clock back to a real UTC instant.
  const start = new Date(localMidnightMs - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Offset in ms to ADD to a UTC instant to get the wall-clock time in `tz`. */
function timezoneOffsetMs(instant: Date, timezone: string): number {
  // Format the instant in the target tz, parse the wall-clock back, diff.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    map.year!,
    map.month! - 1,
    map.day!,
    map.hour! % 24,
    map.minute!,
    map.second!,
  );
  return asUtc - instant.getTime();
}
