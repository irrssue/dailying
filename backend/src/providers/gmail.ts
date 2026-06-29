//
// gmail.ts
//
// Gmail provider: surfaces a small number of *important, unread* emails worth a
// glance first thing. Uses Gmail's own importance + unread signals so we don't
// reinvent prioritization — the morning brief should reflect what Gmail already
// thinks matters, then Claude tightens it into one calm line.
//
// Real client code; needs the gmail.readonly scope on the linked account.
//

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { EmailSignal } from "./types.js";

/** How many important emails to pull at most (the pipeline trims further). */
const MAX_EMAILS = 6;

/**
 * Fetch recent important unread emails. Query mirrors what a person would
 * scan: unread + important + in the inbox, newest first.
 */
export async function fetchImportantEmails(
  auth: OAuth2Client,
): Promise<EmailSignal[]> {
  const gmail = google.gmail({ version: "v1", auth });

  const list = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread is:important in:inbox newer_than:2d",
    maxResults: MAX_EMAILS,
  });

  const messages = list.data.messages ?? [];
  const out: EmailSignal[] = [];

  // Fetch metadata for each (From/Subject/Date headers + snippet). Done in
  // parallel; Gmail metadata calls are cheap.
  const details = await Promise.all(
    messages.map((m) =>
      gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      }),
    ),
  );

  for (const d of details) {
    const msg = d.data;
    if (!msg.id) continue;
    const headers = msg.payload?.headers ?? [];
    const header = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    out.push({
      id: msg.id,
      from: cleanFrom(header("From")),
      subject: header("Subject") || "(no subject)",
      snippet: msg.snippet ?? "",
      receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)) : new Date(),
      unread: (msg.labelIds ?? []).includes("UNREAD"),
      // Deep link into the Gmail/Mail thread. message:// is best-effort on iOS.
      deepLink: `message://`,
    });
  }

  return out;
}

/** "Henri Dupont <henri@x.com>" → "Henri Dupont". */
function cleanFrom(raw: string): string {
  const m = raw.match(/^\s*"?([^"<]+?)"?\s*</);
  if (m && m[1]) return m[1].trim();
  return raw.replace(/[<>]/g, "").trim();
}
