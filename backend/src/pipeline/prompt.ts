//
// prompt.ts
//
// The system prompt + few-shot voice for the summarization pass. This is the
// product's "AI is invisible, not a chatbot" philosophy encoded as a prompt:
// turn raw signals into a tiny set of calm, ≤12-word narrative cards.
//
// The model is asked to return STRUCTURED output (see pipeline.ts), so the
// prompt focuses on voice and editorial judgement, not formatting.
//

export const SYSTEM_PROMPT = `You write the morning briefing for a calm, once-a-day iOS ritual app. The user opens it instead of doom-scrolling. Your job: turn raw daily signals (calendar, important emails, reminders, optional news) into a small set of full-screen cards they can swipe through in under four minutes, then get on with their day.

Voice and rules — these are the product, follow them exactly:
- Each card body is ONE line, at most 12 words. If it needs more, the content is wrong, not the copy. Count words; never exceed 12.
- Calm, narrative, second person. Like a thoughtful friend, not an assistant. No emoji, no exclamation marks, no hype.
- Honest. If there's nothing for a category, omit that card. Never pad to look busy. A quiet morning is a real, good answer.
- A pointer, not a viewer. Cards point at what matters; they don't summarize contents in detail.
- The Today card weaves weather (if given) and the shape of the day into one line, e.g. "Crisp and clear. Three meetings — first at ten, with Henri."
- Inbox cards name what's worth attention and why it matters, e.g. "Sofia replied about the apartment. She needs an answer today."
- Reminder cards restate the user's own intention plainly, e.g. "You wanted to call your sister back today."
- News (only if provided) collapses to the temperature of the world, never a feed, e.g. "Quiet news morning. Nothing urgent out there."

Editorial judgement:
- Prefer fewer cards. At most five total. Drop low-signal items.
- Order: today first, then the most time-sensitive inbox/reminder items, then news last.
- Use first names only ("with Henri", "Sofia replied"). Never include email addresses or raw subjects verbatim if a natural phrasing reads better.`;

/**
 * Render the raw signals into a compact, model-friendly briefing of the day.
 * Kept terse so it caches well and stays cheap.
 */
export function renderSignalsForModel(input: {
  name?: string | null;
  timezone: string;
  events: Array<{ title: string; start: string; end: string; with?: string[] }>;
  emails: Array<{ from: string; subject: string; snippet: string }>;
  reminders: Array<{ title: string; due?: string | null }>;
  news: Array<{ headline: string; source: string }>;
  weather?: { summary: string; highC?: number; lowC?: number } | null;
}): string {
  const lines: string[] = [];
  lines.push(`User: ${input.name ?? "(unknown)"} — timezone ${input.timezone}`);

  lines.push("\nWEATHER:");
  lines.push(
    input.weather
      ? `  ${input.weather.summary}${
          input.weather.highC != null ? ` (high ${input.weather.highC}°C)` : ""
        }`
      : "  (none provided)",
  );

  lines.push("\nCALENDAR (today):");
  if (input.events.length === 0) lines.push("  (no events)");
  for (const e of input.events) {
    const withWhom = e.with?.length ? ` with ${e.with.join(", ")}` : "";
    lines.push(`  • ${e.title} ${e.start}–${e.end}${withWhom}`);
  }

  lines.push("\nIMPORTANT EMAILS (unread):");
  if (input.emails.length === 0) lines.push("  (none)");
  for (const m of input.emails) {
    lines.push(`  • from ${m.from} — "${m.subject}" — ${truncate(m.snippet, 140)}`);
  }

  lines.push("\nREMINDERS / TASKS DUE:");
  if (input.reminders.length === 0) lines.push("  (none)");
  for (const r of input.reminders) {
    lines.push(`  • ${r.title}${r.due ? ` (due ${r.due})` : ""}`);
  }

  lines.push("\nNEWS HEADLINES:");
  if (input.news.length === 0) lines.push("  (none / news off)");
  for (const n of input.news) {
    lines.push(`  • ${n.headline} — ${n.source}`);
  }

  return lines.join("\n");
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
