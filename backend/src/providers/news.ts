//
// news.ts
//
// News provider (opt-in only). Default adapter targets NewsAPI.org's top
// headlines. Returns a tiny set; the pipeline collapses them into one calm
// "here's the temperature of the world" line — never a feed.
//
// TODO(liam): set NEWS_API_KEY (and optionally swap NEWS_PROVIDER). To use a
// different service, add an adapter branch in `fetchTopHeadlines`.
//

import { request } from "undici";
import { env, newsConfigured } from "../config/env.js";
import type { NewsSignal } from "./types.js";
import { ProviderUnconfiguredError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const MAX_HEADLINES = 5;

/**
 * Fetch a handful of top headlines. Returns [] (a "quiet morning") on provider
 * error rather than failing the whole briefing — news is the least critical
 * card and should never block the ritual.
 */
export async function fetchTopHeadlines(): Promise<NewsSignal[]> {
  if (!newsConfigured) {
    // News is opt-in and best-effort; treat unconfigured as "nothing to show"
    // unless the caller explicitly wants the hard error.
    throw new ProviderUnconfiguredError("News");
  }

  if (env.NEWS_PROVIDER === "newsapi") {
    return fetchFromNewsApi();
  }
  return [];
}

async function fetchFromNewsApi(): Promise<NewsSignal[]> {
  const url = new URL(`${env.NEWS_API_BASE_URL}/top-headlines`);
  url.searchParams.set("language", "en");
  url.searchParams.set("pageSize", String(MAX_HEADLINES));
  // Default to general top headlines; could be personalized per user later.
  url.searchParams.set("category", "general");

  try {
    const res = await request(url.toString(), {
      method: "GET",
      headers: { "X-Api-Key": env.NEWS_API_KEY },
    });
    if (res.statusCode >= 400) {
      logger.warn({ status: res.statusCode }, "news provider returned error");
      return [];
    }
    const body = (await res.body.json()) as NewsApiResponse;
    return (body.articles ?? []).slice(0, MAX_HEADLINES).map((a, i) => ({
      id: a.url ?? String(i),
      headline: a.title ?? "",
      source: a.source?.name ?? "News",
      url: a.url ?? "https://apple.news",
    }));
  } catch (err) {
    logger.warn({ err }, "news fetch failed; returning empty");
    return [];
  }
}

interface NewsApiResponse {
  status?: string;
  articles?: Array<{
    title?: string;
    url?: string;
    source?: { name?: string };
  }>;
}
