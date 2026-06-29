//
// tokens.ts
//
// Session tokens for the app's own auth (separate from Google's OAuth tokens).
//
//   • Access token: a short-lived JWT the app sends as `Authorization: Bearer`.
//   • Refresh token: an opaque random string stored server-side in Redis,
//     hashed so a Redis dump alone can't be replayed. The app swaps a valid
//     refresh token for a new access token via POST /auth/refresh.
//
// Keeping refresh state server-side (rather than a long-lived JWT) means we can
// revoke a session immediately on sign-out.
//

import crypto from "node:crypto";
import { redis } from "../db/redis.js";
import { env } from "../config/env.js";

const REFRESH_PREFIX = "refresh:";
const refreshTtlSeconds = env.REFRESH_TTL_DAYS * 24 * 60 * 60;

export interface SessionTokenClaims {
  /** User id. */
  sub: string;
  email: string;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a new opaque refresh token, store its hash → userId in Redis with a TTL,
 * and return the plaintext token to hand to the client.
 */
export async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString("base64url");
  await redis.set(REFRESH_PREFIX + hashToken(token), userId, "EX", refreshTtlSeconds);
  return token;
}

/** Resolve a refresh token to its userId, or null if invalid/expired. */
export async function lookupRefreshToken(token: string): Promise<string | null> {
  return redis.get(REFRESH_PREFIX + hashToken(token));
}

/** Revoke a single refresh token (sign-out on one device). */
export async function revokeRefreshToken(token: string): Promise<void> {
  await redis.del(REFRESH_PREFIX + hashToken(token));
}

/**
 * Rotate a refresh token: validate the old one, revoke it, issue a new one.
 * Returns the new token + userId, or null if the old token was invalid.
 * Rotation limits the blast radius of a leaked refresh token.
 */
export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ token: string; userId: string } | null> {
  const userId = await lookupRefreshToken(oldToken);
  if (!userId) return null;
  await revokeRefreshToken(oldToken);
  const token = await issueRefreshToken(userId);
  return { token, userId };
}
