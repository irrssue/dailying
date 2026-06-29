//
// auth.ts
//
// Auth routes:
//   GET  /auth/google           → start consent; returns the Google URL (the
//                                 app opens it in ASWebAuthenticationSession).
//   GET  /auth/google/callback  → Google redirects here with ?code&state; we
//                                 exchange, link the account, mint our session
//                                 tokens, and hand them back.
//   POST /auth/refresh          → swap a refresh token for a new access token.
//   POST /auth/logout           → revoke a refresh token.
//   GET  /auth/me               → current user (requires access token).
//
// Sign in with Apple is stubbed behind the same session-token machinery; wire
// the Apple identity-token verification in routes/apple.ts when ready.
//

import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildConsentUrl, handleGoogleCallback } from "../auth/google.js";
import { googleConfigured } from "../config/env.js";
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../auth/tokens.js";
import { prisma } from "../db/prisma.js";
import { redis } from "../db/redis.js";
import { BadRequestError, ProviderUnconfiguredError, UnauthorizedError } from "../lib/errors.js";

const STATE_PREFIX = "oauth_state:";
const STATE_TTL = 600; // 10 minutes

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Begin Google consent. We generate + store a CSRF `state`.
  app.get("/auth/google", async () => {
    if (!googleConfigured) throw new ProviderUnconfiguredError("Google OAuth");
    const state = crypto.randomBytes(16).toString("hex");
    await redis.set(STATE_PREFIX + state, "1", "EX", STATE_TTL);
    return { url: buildConsentUrl(state) };
  });

  // Google redirect target.
  app.get("/auth/google/callback", async (req) => {
    const query = z
      .object({ code: z.string().min(1), state: z.string().min(1) })
      .safeParse(req.query);
    if (!query.success) throw new BadRequestError("Missing code or state");

    const stateKey = STATE_PREFIX + query.data.state;
    const ok = await redis.del(stateKey);
    if (!ok) throw new BadRequestError("Invalid or expired state");

    const { userId } = await handleGoogleCallback(query.data.code);
    return issueSession(app, userId);
  });

  // Refresh access token.
  app.post("/auth/refresh", async (req) => {
    const body = z.object({ refreshToken: z.string().min(1) }).safeParse(req.body);
    if (!body.success) throw new BadRequestError("Missing refreshToken");

    const rotated = await rotateRefreshToken(body.data.refreshToken);
    if (!rotated) throw new UnauthorizedError("Invalid refresh token");

    const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user) throw new UnauthorizedError("User no longer exists");

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email });
    return { accessToken, refreshToken: rotated.token };
  });

  // Logout (revoke a refresh token).
  app.post("/auth/logout", async (req, reply) => {
    const body = z.object({ refreshToken: z.string().min(1) }).safeParse(req.body);
    if (body.success) await revokeRefreshToken(body.data.refreshToken);
    reply.code(204);
    return null;
  });

  // Current user.
  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) throw new UnauthorizedError();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      newsEnabled: user.newsEnabled,
      streakDays: user.streakDays,
    };
  });
}

/** Mint an access + refresh token pair for `userId`. */
async function issueSession(app: FastifyInstance, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const accessToken = app.jwt.sign({ sub: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id);
  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}
