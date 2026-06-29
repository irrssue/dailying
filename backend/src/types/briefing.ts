//
// briefing.ts
//
// The wire contract between this backend and the SwiftUI app. These shapes are
// the JSON the app decodes into its `Briefing` / `BriefingCard` / `CalendarBlock`
// models, so the field names and semantics here MUST stay in lockstep with:
//
//   dailying/Models/Briefing.swift
//   dailying/Models/BriefingCard.swift
//   dailying/Models/CardCategory.swift
//
// Notes on the mapping:
//   • category   → CardCategory raw values: "today" | "inbox" | "reminders" | "news"
//   • body       → ≤12-word calm narrative line (enforced in the pipeline)
//   • deepLink   → optional URL string the app hands to openURL
//   • timeline   → only present on the .today card; drives the calendar viz
//   • accentName → CalendarBlock.AccentName raw values (same four cases)
//   • dates are ISO-8601 strings; the app decodes them with .iso8601
//

export type CardCategory = "today" | "inbox" | "reminders" | "news";

export type AccentName = "today" | "inbox" | "reminders" | "news";

export interface CalendarBlockDTO {
  id: string;
  title: string;
  /** ISO-8601, e.g. "2026-06-29T09:00:00Z" */
  start: string;
  /** ISO-8601 */
  end: string;
  accentName: AccentName;
}

export interface BriefingCardDTO {
  id: string;
  category: CardCategory;
  /** ≤12 words, narrative voice. */
  body: string;
  /** Optional deep link the app attempts via openURL; may be null. */
  deepLink: string | null;
  /** Present only for the `today` card. */
  timeline?: CalendarBlockDTO[] | null;
}

export interface BriefingDTO {
  /** ISO-8601 timestamp of when this briefing was assembled. */
  generatedAt: string;
  cards: BriefingCardDTO[];
  streakDays: number;
}
