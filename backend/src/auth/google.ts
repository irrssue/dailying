//
// google.ts
//
// Google OAuth 2.0: building the consent URL, exchanging the auth code for
// tokens, fetching the user's profile, and persisting a linked OAuthAccount.
// This is real client code — it only needs the GOOGLE_* env vars filled in.
//
// Scopes requested:
//   openid email profile           — identity
//   calendar.readonly              — read the user's events
//   gmail.readonly                 — read important emails (metadata + snippets)
//
// TODO(liam): in Google Cloud Console, create an OAuth client, enable the
// Calendar API + Gmail API, add these scopes to the consent screen, and set the
// redirect URI to GOOGLE_REDIRECT_URI. Until then googleConfigured() is false
// and the auth routes return 503.
//

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { ProviderUnconfiguredError, ReauthRequiredError } from "../lib/errors.js";
import { googleConfigured } from "../config/env.js";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

/** A fresh OAuth2 client bound to our app credentials. */
export function makeOAuthClient(): OAuth2Client {
  if (!googleConfigured) throw new ProviderUnconfiguredError("Google OAuth");
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

/**
 * Build the URL the app opens in a browser/ASWebAuthenticationSession.
 * `state` is an opaque value we generate to defend against CSRF on the callback.
 */
export function buildConsentUrl(state: string): string {
  const client = makeOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // force refresh-token issuance on re-link
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
}

/**
 * Exchange an auth code for tokens, read the profile, and upsert the User +
 * OAuthAccount. Returns the local user id.
 */
export async function handleGoogleCallback(code: string): Promise<{ userId: string }> {
  const client = makeOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Identify the user from the id_token / userinfo.
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.id || !data.email) {
    throw new ReauthRequiredError("google");
  }
  const profile: GoogleProfile = {
    sub: data.id,
    email: data.email,
    name: data.name ?? undefined,
  };

  // Upsert the user by email, then upsert the linked account with tokens.
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: { name: profile.name ?? undefined },
    create: { email: profile.email, name: profile.name ?? null },
  });

  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: profile.sub,
      },
    },
    update: {
      userId: user.id,
      accessToken: tokens.access_token ?? undefined,
      // Google omits refresh_token on re-consent unless prompt=consent; keep
      // the existing one if a new one isn't returned.
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope ?? undefined,
    },
    create: {
      userId: user.id,
      provider: "google",
      providerAccountId: profile.sub,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
    },
  });

  return { userId: user.id };
}

/**
 * Return an OAuth2 client authorized as `userId`, refreshing the access token
 * if it's expired and persisting the refreshed token. Throws ReauthRequired if
 * the refresh token has been revoked — the app should re-run consent.
 *
 * This is what the provider clients (calendar, gmail) call to get an authed
 * client for API requests.
 */
export async function getAuthedClientForUser(userId: string): Promise<OAuth2Client> {
  const account = await prisma.oAuthAccount.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account || !account.refreshToken) {
    throw new ReauthRequiredError("google");
  }

  const client = makeOAuthClient();
  client.setCredentials({
    access_token: account.accessToken ?? undefined,
    refresh_token: account.refreshToken,
    expiry_date: account.expiresAt?.getTime(),
  });

  // Refresh proactively if expired or about to (60s skew).
  const expired =
    !account.expiresAt || account.expiresAt.getTime() - Date.now() < 60_000;
  if (expired) {
    try {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);
      await prisma.oAuthAccount.update({
        where: { id: account.id },
        data: {
          accessToken: credentials.access_token ?? account.accessToken,
          expiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : account.expiresAt,
        },
      });
    } catch {
      throw new ReauthRequiredError("google");
    }
  }

  return client;
}
