//
// types.ts
//
// The raw, un-summarized "signals" the providers return. The Claude pipeline
// consumes these and turns them into calm ≤12-word cards. Keeping a clean
// provider→signal→pipeline seam means swapping Google for Apple/EventKit later
// is a provider change, not a pipeline rewrite.
//

/** A calendar event for "today" in the user's timezone. */
export interface CalendarEventSignal {
  id: string;
  title: string;
  start: Date;
  end: Date;
  /** Other attendees' display names, if any (used for "with Henri"). */
  attendees?: string[];
  location?: string | null;
}

/** An email worth surfacing. */
export interface EmailSignal {
  id: string;
  from: string;
  subject: string;
  /** Short snippet/preview text. */
  snippet: string;
  receivedAt: Date;
  unread: boolean;
  /** A deep link back to the message in the mail app, if derivable. */
  deepLink?: string | null;
}

/** A reminder / task due soon. */
export interface ReminderSignal {
  id: string;
  title: string;
  due?: Date | null;
  deepLink?: string | null;
}

/** A news headline (only fetched when the user has opted in). */
export interface NewsSignal {
  id: string;
  headline: string;
  source: string;
  url: string;
}

/** Light weather context woven into the Today card body. */
export interface WeatherSignal {
  summary: string; // e.g. "Crisp and clear"
  highC?: number;
  lowC?: number;
}

/** Everything gathered for one user, ready for the pipeline. */
export interface BriefingSignals {
  events: CalendarEventSignal[];
  emails: EmailSignal[];
  reminders: ReminderSignal[];
  news: NewsSignal[];
  weather?: WeatherSignal | null;
}
