//
// pipeline.ts
//
// The Claude summarization pass. Takes raw BriefingSignals and produces the
// final BriefingDTO the app renders. Uses the Anthropic SDK with structured
// outputs (output_config.format) so we get back a schema-valid card list rather
// than parsing free text.
//
// Model: claude-opus-4-8 (current default). Adaptive thinking is on — the
// editorial judgement (what to drop, how to phrase) benefits from it, and the
// output is tiny so cost stays low.
//
// The card TEXT comes from the model; the structured data (calendar timeline,
// deep links) is stitched in deterministically from the signals afterward — we
// never trust the model to echo timestamps or URLs.
//

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env, anthropicConfigured } from "../config/env.js";
import { ProviderUnconfiguredError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { SYSTEM_PROMPT, renderSignalsForModel } from "./prompt.js";
import type { BriefingSignals } from "../providers/types.js";
import type {
  BriefingCardDTO,
  BriefingDTO,
  CalendarBlockDTO,
  AccentName,
} from "../types/briefing.js";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!anthropicConfigured) throw new ProviderUnconfiguredError("Anthropic");
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

// The shape we ask the model to emit. Bodies are validated ≤12 words after.
const ModelCardSchema = z.object({
  category: z.enum(["today", "inbox", "reminders", "news"]),
  body: z.string(),
});
const ModelOutputSchema = z.object({
  cards: z.array(ModelCardSchema),
});

// JSON Schema handed to the API (structured outputs). Mirrors ModelOutputSchema.
const OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["today", "inbox", "reminders", "news"] },
          body: { type: "string" },
        },
        required: ["category", "body"],
        additionalProperties: false,
      },
    },
  },
  required: ["cards"],
  additionalProperties: false,
} as const;

/** Round-robin accents for calendar blocks so the timeline reads varied. */
const BLOCK_ACCENTS: AccentName[] = ["reminders", "today", "news", "inbox", "reminders"];

export interface BuildBriefingInput {
  user: { id: string; name?: string | null; timezone: string };
  signals: BriefingSignals;
  streakDays: number;
  now?: Date;
}

/**
 * Produce a complete BriefingDTO from signals. If there's genuinely nothing to
 * say, returns a briefing with an empty card list (the app shows its honest
 * empty state).
 */
export async function buildBriefing(input: BuildBriefingInput): Promise<BriefingDTO> {
  const { user, signals, streakDays } = input;
  const now = input.now ?? new Date();

  const hasAnything =
    signals.events.length > 0 ||
    signals.emails.length > 0 ||
    signals.reminders.length > 0 ||
    signals.news.length > 0;

  if (!hasAnything) {
    return { generatedAt: now.toISOString(), cards: [], streakDays };
  }

  const rendered = renderSignalsForModel({
    name: user.name,
    timezone: user.timezone,
    events: signals.events.map((e) => ({
      title: e.title,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      with: e.attendees,
    })),
    emails: signals.emails.map((m) => ({
      from: m.from,
      subject: m.subject,
      snippet: m.snippet,
    })),
    reminders: signals.reminders.map((r) => ({
      title: r.title,
      due: r.due?.toISOString() ?? null,
    })),
    news: signals.news.map((n) => ({ headline: n.headline, source: n.source })),
    weather: signals.weather ?? null,
  });

  const modelCards = await summarize(rendered);

  // Stitch structured data back in, enforce the 12-word rule, cap at MAX_CARDS.
  const cards = assembleCards(modelCards, signals);

  return {
    generatedAt: now.toISOString(),
    cards: cards.slice(0, env.MAX_CARDS),
    streakDays,
  };
}

/** Call Claude and return the model's card list (text only). */
async function summarize(
  rendered: string,
): Promise<Array<{ category: AccentName; body: string }>> {
  const res = await anthropic().messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_JSON_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Here are today's raw signals. Write the briefing cards.\n\n${rendered}`,
      },
    ],
  });

  if (res.stop_reason === "refusal") {
    logger.warn({ stopDetails: res.stop_reason }, "summarization refused");
    return [];
  }

  // output_config.format guarantees the first text block is valid JSON.
  const textBlock = res.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  let parsed: z.infer<typeof ModelOutputSchema>;
  try {
    parsed = ModelOutputSchema.parse(JSON.parse(raw));
  } catch (err) {
    logger.error({ err, raw }, "failed to parse model output");
    return [];
  }
  return parsed.cards;
}

/**
 * Combine the model's card text with deterministic structured data:
 *   • today card  → attach the real calendar timeline + calshow:// deep link
 *   • inbox card  → message:// deep link
 *   • reminders   → x-apple-reminderkit:// deep link
 *   • news        → first headline URL
 * Also enforces ≤12 words by trimming overlong bodies as a safety net.
 */
function assembleCards(
  modelCards: Array<{ category: AccentName; body: string }>,
  signals: BriefingSignals,
): BriefingCardDTO[] {
  const out: BriefingCardDTO[] = [];

  for (const mc of modelCards) {
    const body = enforceWordCap(mc.body, 12);
    if (!body) continue;

    switch (mc.category) {
      case "today":
        out.push({
          id: cid(),
          category: "today",
          body,
          deepLink: "calshow://",
          timeline: buildTimeline(signals),
        });
        break;
      case "inbox":
        out.push({ id: cid(), category: "inbox", body, deepLink: "message://", timeline: null });
        break;
      case "reminders":
        out.push({
          id: cid(),
          category: "reminders",
          body,
          deepLink: "x-apple-reminderkit://",
          timeline: null,
        });
        break;
      case "news":
        out.push({
          id: cid(),
          category: "news",
          body,
          deepLink: signals.news[0]?.url ?? "https://apple.news",
          timeline: null,
        });
        break;
    }
  }

  // Stable order: today, inbox, reminders, news.
  const rank: Record<AccentName, number> = { today: 0, inbox: 1, reminders: 2, news: 3 };
  out.sort((a, b) => rank[a.category] - rank[b.category]);
  return out;
}

function buildTimeline(signals: BriefingSignals): CalendarBlockDTO[] {
  return signals.events.map((e, i) => ({
    id: cid(),
    title: e.title,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    accentName: BLOCK_ACCENTS[i % BLOCK_ACCENTS.length]!,
  }));
}

/** Trim to ≤max words, dropping a trailing partial sentence cleanly. */
function enforceWordCap(body: string, max: number): string {
  const words = body.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return body.trim();
  return words.slice(0, max).join(" ");
}

function cid(): string {
  return "c_" + Math.random().toString(36).slice(2, 12);
}
