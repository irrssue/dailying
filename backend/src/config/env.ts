//
// env.ts
//
// Single, validated source of truth for runtime configuration. Everything the
// backend needs comes through here, parsed once at startup so a missing or
// malformed variable fails loud and early instead of deep inside a request.
//
// Credentials that need Liam's manual setup (Google OAuth, Anthropic, news)
// are optional at the schema level so the server still boots for local work;
// the relevant provider throws a clear, actionable error only when actually
// invoked without its key. See `requireGoogle()` / `requireAnthropic()` etc.
//

import { z } from "zod";

const schema = z.object({
  // Server
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGINS: z.string().default(""),

  // Datastores
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Auth
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Google OAuth — optional so the server boots without it; required at use.
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z
    .string()
    .default("http://localhost:8080/auth/google/callback"),

  // Apple — fully optional.
  APPLE_CLIENT_ID: z.string().default(""),
  APPLE_TEAM_ID: z.string().default(""),
  APPLE_KEY_ID: z.string().default(""),
  APPLE_PRIVATE_KEY: z.string().default(""),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),

  // News
  NEWS_PROVIDER: z.enum(["newsapi", "none"]).default("newsapi"),
  NEWS_API_KEY: z.string().default(""),
  NEWS_API_BASE_URL: z.string().default("https://newsapi.org/v2"),

  // Briefing job
  BRIEFING_CRON: z.string().default("30 4 * * *"),
  MAX_CARDS: z.coerce.number().int().positive().max(5).default(5),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Surface every problem at once rather than failing on the first.
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** True when Google OAuth has been configured. */
export const googleConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

/** True when the Anthropic pipeline can run. */
export const anthropicConfigured = Boolean(env.ANTHROPIC_API_KEY);

/** True when a news adapter can fetch. */
export const newsConfigured =
  env.NEWS_PROVIDER !== "none" && Boolean(env.NEWS_API_KEY);
