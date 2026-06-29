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

## Running it locally

### 1. Prerequisites

- Node 20+
- Docker (for Postgres + Redis), or your own instances

### 2. Datastores

```bash
cd backend
docker compose up -d        # postgres on :5432, redis on :6379
```

### 3. Env

```bash
cp .env.example .env
# Generate a JWT secret:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# Paste it as JWT_SECRET, then fill the TODO(liam) credentials (see below).
```

### 4. Install + migrate

```bash
npm install
npm run prisma:generate
npm run prisma:migrate      # creates the schema in Postgres
```

### 5. Run

```bash
npm run dev        # API on :8080  (http://localhost:8080/healthz)
npm run worker     # BullMQ worker, in a second terminal
```

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

`Dockerfile` builds one image used for both processes. Run the API with the
default `CMD`; run the worker with the command overridden to
`node dist/jobs/worker.js`. Apply migrations with `npm run prisma:deploy` on
release. Point `DATABASE_URL` / `REDIS_URL` / the credential env vars at your
managed instances.
