# dailying — backend

The server behind the **dailying** morning-ritual iOS app. It assembles a calm
daily briefing from Google Calendar + Gmail (+ optional news), summarizes it
into a handful of ≤12-word cards with Claude, and serves it to the app in the
exact JSON shape the SwiftUI `Briefing` models decode.

> The frontend (in `../dailying`) was built to run on mock data. This backend is
> the thing that replaces `MockData` — same card model, real data.

## What it does

```
                         ┌──────────────┐
  Google Calendar  ──┐   │   providers  │   ┌──────────────┐   ┌──────────┐
  Gmail            ──┼──▶│  (gather     │──▶│  Claude      │──▶│ Postgres │
  Tasks/Reminders  ──┤   │   signals)   │   │  pipeline    │   │ (cards)  │
  News (opt-in)    ──┘   └──────────────┘   │ (≤12-word    │   └────┬─────┘
                                            │  cards)      │        │
                                            └──────────────┘        ▼
   iOS app ◀────────── GET /briefing/today (BriefingDTO) ◀──── Fastify API
```

- **Auth:** Google OAuth (also the data-scope grant) → the app gets its own
  session tokens (short-lived access JWT + rotating refresh token in Redis).
- **Providers:** Calendar + Gmail are real Google API clients; Reminders uses
  Google Tasks (optional scope) and News uses a pluggable adapter (NewsAPI by
  default). Each best-effort source soft-fails so it never sinks the briefing.
- **Pipeline:** `claude-opus-4-8` with structured outputs turns raw signals into
  calm cards. Structured data (timeline, deep links) is stitched in
  deterministically — the model only writes the prose.
- **Jobs:** a BullMQ sweep (cron) regenerates every linked user's briefing; the
  app also generates on demand on first open of the day.

## Architecture

```
src/
  config/env.ts          validated env (single source of truth)
  db/                    prisma + redis clients
  auth/                  google oauth, session tokens, fastify auth plugin
  providers/             calendar, gmail, reminders, news → BriefingSignals
  pipeline/              prompt + Claude call + assembly + persistence service
  jobs/                  bullmq queue, scheduler, worker
  routes/                auth, briefing, settings, health
  lib/                   logger, errors, time, streak
  types/briefing.ts      the wire contract (mirrors the Swift models)
prisma/schema.prisma     User, OAuthAccount, Briefing, BriefingCard, CalendarBlock
```

The wire contract in `src/types/briefing.ts` is the load-bearing seam — it must
stay in lockstep with `../dailying/Models/{Briefing,BriefingCard,CardCategory}.swift`.

## Running it

There are two supported topologies. The day-to-day one is **A**.

### A. Dev on the Mac, datastores on the homeserver (default)

Postgres + Redis run in Docker on the homeserver (`homelab`), bound to its
Tailscale IP so they're reachable from the tailnet (this Mac, the phone) but
not the LAN or the public internet. The API + worker run on the Mac via `tsx`
for fast reload.

```bash
# On the homeserver, once — bring up the datastores:
#   cd ~/docker/dailying && BIND_IP=$(tailscale ip -4 | head -1) \
#     docker compose up -d
# (the compose file is this repo's backend/docker-compose.yml)

# On the Mac:
cd backend
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#   ↳ paste as JWT_SECRET; DATABASE_URL/REDIS_URL already point at `homelab`.
npm install
npm run prisma:generate
npm run prisma:deploy      # apply migrations to the homeserver Postgres
npm run dev                # API on :8080  (http://localhost:8080/healthz)
npm run worker             # BullMQ worker, in a second terminal
```

`homelab` resolves to the Tailscale IP via MagicDNS, so no `/etc/hosts` edit is
needed as long as Tailscale is up on both machines.

### B. Full stack in containers on the homeserver

Run the API + worker as containers too, alongside the datastores — see
[Deploy](#deploy). Use this once you're not iterating on the backend.

### Local-only fallback (no homeserver)

Leave `BIND_IP` unset (binds to `127.0.0.1`), point `DATABASE_URL`/`REDIS_URL`
at `localhost`, and `docker compose up -d` the datastores on your own machine.

Check readiness — it reports which credentials are still missing:

```bash
curl localhost:8080/readyz | jq
```

## Credentials you (Liam) need to provide

These are the manual, account-level steps the code can't do for you. Each is
flagged with `// TODO(liam):` at its use site, and `/readyz` shows which are
still unset.

| What | Where | Env vars |
|---|---|---|
| **Google OAuth** (Calendar + Gmail) | Google Cloud Console: create an OAuth client, enable Calendar API + Gmail API, add the scopes to the consent screen, set the redirect URI | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| **Anthropic** | console.anthropic.com → API key | `ANTHROPIC_API_KEY` |
| **News** (optional) | newsapi.org (or swap the adapter) | `NEWS_API_KEY` |
| **Google Tasks** (optional, for reminders) | enable Tasks API + add `tasks.readonly` to `GOOGLE_SCOPES` in `auth/google.ts` | — |
| **Apple Sign-In** (optional) | Apple Developer portal | `APPLE_*` |
| **Weather** (optional) | pick a provider, add an adapter in `providers/index.ts` | — |

Everything compiles and the server boots without these; a route that needs an
unconfigured provider returns `503 provider_unconfigured` with a clear message,
so the app can degrade gracefully.

## API

All app-facing routes require `Authorization: Bearer <accessToken>` except the
auth and health routes.

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/healthz` | liveness |
| `GET`  | `/readyz` | readiness + which providers are configured |
| `GET`  | `/auth/google` | → `{ url }` to open for consent |
| `GET`  | `/auth/google/callback` | OAuth redirect → `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/refresh` | `{ refreshToken }` → new `{ accessToken, refreshToken }` |
| `POST` | `/auth/logout` | revoke a refresh token |
| `GET`  | `/auth/me` | current user |
| `GET`  | `/briefing/today` | today's `BriefingDTO` (`?refresh=1` to regenerate) |
| `GET`  | `/settings` | current settings |
| `PATCH`| `/settings` | update `newsEnabled` / `name` / `timezone` |

### Wiring the app to it

In `../dailying/ViewModels/BriefingViewModel.swift`, the `// TODO(liam): swap
MockData for the real briefing fetch` is where this comes in: call
`GET /briefing/today`, decode into `Briefing` with a `.iso8601` date strategy,
and assign to `briefing`. The JSON field names already match the Swift models.

## Jobs

- **Sweep** (`BRIEFING_CRON`, default 04:30 daily): enqueues a generate job per
  linked user.
- **Generate**: gathers signals → Claude → persists. Retries transient failures
  with backoff; skips users needing re-consent.

Run the worker with `npm run worker` (dev) or `node dist/jobs/worker.js` (prod).

## Tests

```bash
npm test          # pure-logic tests (time, contract); no network/DB needed
npm run typecheck # full TS typecheck
```

## Deploy

The whole stack runs on the homeserver via Compose. `docker-compose.yml` holds
the datastores; `docker-compose.prod.yml` overlays the API + worker (and a
one-shot `migrate` service that runs `prisma migrate deploy` before they start).
All three app processes share one image built from the `Dockerfile`.

Deployed location on the homeserver: **`~/dailying/backend/`** (a git checkout —
`git pull` to update). `.env` lives there with `BIND_IP` = the Tailscale IP,
`API_PORT=8090`, `NODE_ENV=production`, and a server-specific `JWT_SECRET`.

```bash
# On the homeserver, in ~/dailying/backend, with .env populated:
git pull
# Rebuild the image when code changed (safe to skip if only compose/env changed):
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml build
# Bring the stack up. Pass --env-file explicitly so BIND_IP/API_PORT interpolate.
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --no-recreate
```

This brings up `dailying_postgres`, `dailying_redis`, runs `dailying_migrate`
to completion, then starts `dailying_api` and `dailying_worker`. The api/worker
containers reach the stores by service name — the overlay sets their
`DATABASE_URL`/`REDIS_URL`, so the `homelab` values in `.env` (used by the Mac
dev workflow) are ignored inside the containers.

The API is published on `BIND_IP:API_PORT`. On the homeserver nextcloud already
holds host port 8080, so `API_PORT=8090`; the container still listens on 8080
internally.

> **Recreate gotcha.** On this host (Docker 29 / Compose v5.1.3) a plain
> `compose up` that has to *recreate* a running container hangs in the recreate
> step. So:
> - **New image / code change:** recreate one service at a time, datastores
>   untouched:
>   ```bash
>   docker rm -f dailying_api dailying_worker
>   docker compose --env-file ... up -d --no-recreate   # re-creates them fresh
>   ```
>   (`--no-recreate` only *creates* missing containers, which doesn't hang;
>   removing-then-creating avoids the recreate path entirely.)
> - **Never** recreate `postgres`/`redis` this way — stopping them mid-recreate
>   is what left the stack half-down once. They rarely need recreating; if they
>   do, `docker stop`/`docker start` them directly.

Verify:

```bash
curl http://$BIND_IP:${API_PORT:-8080}/readyz | jq
# → {"ready":true,"checks":{"postgres":true,"redis":true}, ...}
```
