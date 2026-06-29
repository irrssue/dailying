import { test } from "node:test";
import assert from "node:assert/strict";
import { localDateKey, dayBoundsInTimezone } from "../src/lib/time.js";

test("localDateKey returns the local calendar day", () => {
  // 2026-06-29T01:00:00Z is still 2026-06-28 in Los Angeles (UTC-7).
  const instant = new Date("2026-06-29T01:00:00Z");
  assert.equal(localDateKey(instant, "America/Los_Angeles"), "2026-06-28");
  assert.equal(localDateKey(instant, "UTC"), "2026-06-29");
});

test("dayBoundsInTimezone spans exactly 24h and brackets the instant", () => {
  const instant = new Date("2026-06-29T15:00:00Z");
  const { start, end } = dayBoundsInTimezone(instant, "Europe/Paris");
  assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
  assert.ok(start <= instant && instant < end);
  // Paris is UTC+2 in summer, so local midnight is 22:00 UTC the previous day.
  assert.equal(start.toISOString(), "2026-06-28T22:00:00.000Z");
});
