import { test } from "node:test";
import assert from "node:assert/strict";
import type { BriefingDTO } from "../src/types/briefing.js";

// Guards the wire contract against the Swift models. If the app's decoder
// changes, update both sides together. This is a shape check, not a runtime
// fetch — it documents and pins the field names the app depends on.
test("BriefingDTO shape matches the app's decoder", () => {
  const sample: BriefingDTO = {
    generatedAt: "2026-06-29T07:00:00.000Z",
    streakDays: 7,
    cards: [
      {
        id: "c_abc",
        category: "today",
        body: "Crisp and clear. Three meetings — first at ten, with Henri.",
        deepLink: "calshow://",
        timeline: [
          {
            id: "b_1",
            title: "1:1 with Henri",
            start: "2026-06-29T08:00:00.000Z",
            end: "2026-06-29T09:00:00.000Z",
            accentName: "today",
          },
        ],
      },
      {
        id: "c_def",
        category: "inbox",
        body: "Sofia replied about the apartment. She needs an answer today.",
        deepLink: "message://",
        timeline: null,
      },
    ],
  };

  // Every required key the Swift side reads must be present and well-typed.
  assert.equal(typeof sample.generatedAt, "string");
  assert.equal(typeof sample.streakDays, "number");
  for (const card of sample.cards) {
    assert.ok(["today", "inbox", "reminders", "news"].includes(card.category));
    assert.ok(card.body.split(/\s+/).length <= 12, `body over 12 words: ${card.body}`);
    assert.ok(card.deepLink === null || typeof card.deepLink === "string");
  }
});
