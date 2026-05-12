# LiteCode

A LeetCode-style coding judge platform built as a Turborepo monorepo. Users solve algorithmic problems in a browser-based Monaco editor, submissions are graded asynchronously by background workers calling pluggable code-execution backends, and premium users get AI-powered hints, conceptual help, and code roasts.

The project is split into two NestJS services — a request-path API (`backend-core`) and a worker (`backend-secondary`) — plus a Vite + React 19 web app, all sharing typed packages for DB access, caching, queue contracts, and judge clients.

## Features

- **Problem catalog & editor** — browse problems by topic / difficulty, solve in Monaco, multi-language support driven by per-problem `CodeTemplate`s.
- **Async grading pipeline** — `submitSolution` enqueues a job; a worker assembles the full source from a driver template, executes test cases on a pluggable judge backend, compares output, and writes a verdict. Side-effect jobs fan out for problem stats and ratings.
- **Pluggable judge backends** — Self-hosted Piston, RapidAPI Judge0, JDoodle. Selected via `JUDGE_PROVIDER`.
- **AI assistance (premium)** — three modes: `hint` (one nudge, ≤80 words, no code), `help` (conceptual answer to a question, ≤200 words), `roast` (sharp review of *your own* submission). Pluggable providers: OpenAI, Gemini, Grok, OpenRouter, or `mock` for keyless local dev.
- **Subscriptions via Razorpay** — Razorpay-hosted checkout, webhook-driven tier sync, idempotent webhook log, and a nightly cron backstop that demotes users whose `currentPeriodEnd` has passed if a webhook was missed.
- **Discuss & Solutions** — per-problem editorial Solutions with replies, plus a general Discuss section organised by Topics.
- **Admin panel** — problem CRUD, template management, admin invitation flow with permission scoping.
- **Bull-Board dashboard** — live queue inspection at `/queues`, basic-auth gated.
- **Cache layer** — shared Redis cache-aside helper used for hot reads (problem list slices, problem detail, code-template existence, user tier, user solved-map, topics list).

## Architecture

```
                          ┌───────────────────────────────┐
                          │  apps/web   (Vite + React 19) │
                          │  TanStack Query, graphql-     │
                          │  request, Monaco, Tailwind    │
                          └──────────────┬────────────────┘
                                         │  GraphQL  /  REST (auth, webhooks)
                                         ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │  apps/backend-core   (NestJS 11)                                    │
   │  ─ Apollo GraphQL (code-first, schema.gql)                          │
   │  ─ Auth (JWT), Problems, Submissions, Solutions, Discuss,           │
   │    Profile, Admin, Subscription, AI                                 │
   │  ─ POST /webhooks/razorpay  (idempotent, tx-bound tier sync)        │
   │  ─ /queues  (Bull-Board UI)                                         │
   └───────┬──────────────────────────┬───────────────────┬──────────────┘
           │ enqueue                  │ read/write        │ get/set
           ▼                          ▼                   ▼
   ┌──────────────────┐      ┌──────────────────┐   ┌──────────────────┐
   │  Redis (BullMQ)  │      │   Postgres       │   │   Redis (cache)  │
   │  queues:         │      │   (Prisma)       │   │   cache-aside    │
   │   • grade-       │      │   schema split   │   │   SCAN-based     │
   │     submission   │      │   across files   │   │   pattern delete │
   │   • update-      │      │                  │   │                  │
   │     problem-     │      └────────▲─────────┘   └────────▲─────────┘
   │     stats        │               │                      │
   │   • update-      │               │ read/write           │
   │     rating       │               │                      │
   └────────┬─────────┘               │                      │
            │ consume                 │                      │
            ▼                         │                      │
   ┌─────────────────────────────────────────────────────────────────────┐
   │  apps/backend-secondary   (NestJS 11, worker)                       │
   │  ─ GraderProcessor: assemble source → run test cases → write        │
   │    verdict → fan-out stats/rating jobs                              │
   │  ─ ProblemStatsProcessor: idempotent counter increments             │
   │    (ProblemStatsLedger guards at-least-once)                        │
   └───────────────────────────┬─────────────────────────────────────────┘
                               │ HTTP
                               ▼
                  ┌────────────────────────────┐
                  │   Judge backend            │
                  │      Piston (self-hosted)  │
                  │     / JDoodle / Judge0     │
                  └────────────────────────────┘

   External:  Razorpay  ──── webhook ───►  backend-core  /webhooks/razorpay
              AI provider ◄── HTTPS ──── backend-core (Premium-only, on demand)
```

## Monorepo structure

```
apps/
  backend-core/        NestJS API: GraphQL + REST webhooks + Bull-Board
  backend-secondary/   NestJS worker: grader + problem-stats processors
  web/                 React 19 + Vite + Tailwind + Monaco

packages/
  db/                  Prisma schema (split files), client, migrations, seeds
  cache/               Redis CacheService + centralized cache-key registry
  queue/               Queue names, job payload types, Redis URL parser
  judge/               Judge backend clients (Judge0, JDoodle, Piston) + language maps
  shared-types/        Cross-package enums/types (auth, problem, submission, discuss, profile)
  ui/                  Shared React components
  eslint-config/       Shared ESLint config
  typescript-config/   Shared tsconfig presets
```

### `apps/backend-core`

The user-facing API. Apollo Server runs in code-first mode and emits the schema to [schema.gql](apps/backend-core/schema.gql). Modules:

- `auth` — JWT issuance + guards, registration, login, admin invitation acceptance.
- `profile`, `participant`, `admin` — user-facing and admin-facing profile / management resolvers.
- `submission` — `submitSolution` mutation, listing, detail. Enforces free-tier quota (5 submissions per problem) and premium-only problem gating before enqueuing.
- `solution` — per-problem editorial solutions + replies.
- `discuss` — global discussion forum + replies, organised by Topic.
- `subscription` — `listPlans`, `startSubscription`, `cancelSubscription` GraphQL resolver + Razorpay REST webhook controller.
- `ai` — `aiHint`, `aiHelp`, `aiRoast` mutations, premium-gated via an entitlement guard.
- `entitlement` — central tier resolution, cached per-user; invalidated on subscription state changes.
- `bull-board` — basic-auth gated Bull-Board UI at `/queues`.

### `apps/backend-secondary`

A headless NestJS app with no HTTP surface — purely BullMQ workers:

- `GraderProcessor` (`grade-submission`, concurrency 5) — see [grader.service.ts](apps/backend-secondary/src/grader/grader.service.ts). Loads submission + problem + template + test cases, assembles source via `assembleSource(driverCode, userCode)`, calls the judge client per test case, fails fast on first non-AC verdict, persists per-case results as JSON on the submission row, busts the user's solved-map cache, and enqueues a `update-problem-stats` job.
- `ProblemStatsProcessor` (`update-problem-stats`) — idempotent counter increments guarded by a `ProblemStatsLedger` row, so at-least-once delivery is safe.

### `apps/web`

Vite + React 19 SPA. Routing via `react-router-dom@7`. Data fetching via TanStack Query over `graphql-request`. Editor via `@monaco-editor/react`. UI built on Radix primitives + Tailwind 4 (`tw-animate-css`). Auth state in Zustand.

Pages: Problems, ProblemDetail (split-pane editor + tabs), Submissions, Solutions pane, Discuss / Topics / DiscussPost / DiscussNew, Profile, Plans, Login, Signup.

### `packages/db`

Prisma 5 with the `prismaSchemaFolder` preview feature — the schema is split into [user](packages/db/prisma/schema/user.prisma), [problem](packages/db/prisma/schema/problem.prisma), [submission](packages/db/prisma/schema/submission.prisma), [solution](packages/db/prisma/schema/solution.prisma), [discuss](packages/db/prisma/schema/discuss.prisma), [topic](packages/db/prisma/schema/topic.prisma), [profile](packages/db/prisma/schema/profile.prisma), [subscription](packages/db/prisma/schema/subscription.prisma) files. Re-exports the generated client + a `PrismaService` Nest module.

### `packages/cache`

[CacheService](packages/cache/src/cache.service.ts) wraps ioredis with `get`, `set`, `del`, `delPattern` (SCAN-based, never `KEYS`), and a `getOrSet` cache-aside helper that skips writing nulls. Uses a **separate Redis connection** from BullMQ — queue clients require `maxRetriesPerRequest=null`, which is wrong for request-path reads.

All keys are minted via [cache.keys.ts](packages/cache/src/cache.keys.ts), versioned (`v1`, `v2`) so payload-shape changes can be rolled out by bumping the version segment — old entries simply miss and refill.

### `packages/queue`

The single source of truth for queue names + job payload shapes ([index.ts](packages/queue/index.ts)). Three queues: `grade-submission`, `update-problem-stats`, `update-rating`. Also exports `getRedisConnection(url)`, a parser that turns a `redis://` / `rediss://` URL into the ioredis options object both apps need.

### `packages/judge`

Pluggable judge clients implementing a common [JudgeClient](packages/judge/src/judge.interface.ts) interface. Each backend has its own client + language-map module:

- `jdoodle.client.ts` — Free tier: 200 credits/day. Platform-level CPU/memory limits.
- `piston.client.ts` — public emkc.org instance is whitelist-only since 2026-02-15; self-host for unrestricted use. **This project's deploy targets a self-hosted Piston instance.**
- `rapidapi-judge0.client.ts` — Judge0 Community Edition via RapidAPI.

Selected at module-init in `backend-secondary` via the `JUDGE_PROVIDER` env var, injected into `GraderService` through the `JUDGE_CLIENT` token.

## Submission & grading flow

1. Web calls `submitSolution(input)` GraphQL mutation.
2. `SubmissionService.submit` ([submission.service.ts](apps/backend-core/src/submission/submission.service.ts)) runs the gauntlet:
   - Code length validation (max 65,536 chars).
   - Problem exists + is published.
   - Tier gate: if `problem.tier === PREMIUM` and user is FREE → `PROBLEM_REQUIRES_PREMIUM`.
   - Free-tier quota: FREE users capped at 5 submissions per problem.
   - `(problemId, language)` template existence is cache-aside (`template:v1:<problemId>:<language>`, TTL 24h, invalidated by `admin.setCodeTemplate`).
3. Submission row inserted with `status=PENDING`.
4. BullMQ job pushed onto `grade-submission` with `attempts=3` and exponential backoff.
5. `GraderProcessor` in `backend-secondary` consumes the job:
   - Loads submission + problem + templates + test cases.
   - Skips if already `GRADED` (re-delivery idempotency).
   - `assembleSource(template.driverCode, submission.code)` produces the full compiled-source string. The driver wires `stdin`-to-args parsing and serializes the return value; the user only supplies the function body.
   - Marks `RUNNING`, then iterates test cases sequentially:
     - Calls `judge.run({...})` with the problem's `timeLimit_ms` (wall = 2× CPU) and `memoryLimit_kb`.
     - Maps judge status → `Verdict` enum, then verifies stdout matches expected output (`outputsMatch`).
     - **Fail-fast**: first non-AC case breaks the loop.
   - Persists `testResults` JSON, `verdict`, `runtime_ms` / `memory_kb` (max across cases), `failedTestCaseId`, `errorMessage`, `status=GRADED`.
   - Invalidates `user:<id>:solved-map` in cache.
   - Enqueues `update-problem-stats` (`attempts=5`).
6. `ProblemStatsProcessor` consumes the stats job: increments `Problem.attemptCount` / `solveCount`, guarded by `ProblemStatsLedger` to make double-deliveries no-ops.

Infrastructure failures inside the judge call (HTTP errors, timeouts) throw out of the processor, so BullMQ retries the whole job per its `attempts` config. Verdicts that come back as `INTERNAL_ERROR` from the judge itself are persisted as final state (not retried).

## AI features (premium)

Three GraphQL mutations on `AiResolver` ([ai.service.ts](apps/backend-core/src/ai/ai.service.ts)):

- **`aiHint(problemId, code?, language?)`** — system prompt forbids revealing the solution. Loads the problem, optionally embeds the user's WIP code, returns one nudge ≤80 words. `temperature=0.7`, `maxOutputTokens=200`.
- **`aiHelp(problemId, code, language, question)`** — conceptual explanation answering a specific question. May show small illustrative snippets, never the full solution. ≤200 words. `temperature=0.5`, `maxOutputTokens=500`.
- **`aiRoast(submissionId)`** — sharp, funny code review of *your own* submission only (ownership-checked against `userId`). 3–5 sentences. `temperature=0.9`, `maxOutputTokens=300`.

All three are gated by the entitlement guard, so FREE users get a structured error.

### Providers

`AiProviderFactory` picks one of the implementations under [providers/](apps/backend-core/src/ai/providers/) based on `AI_PROVIDER`:

| `AI_PROVIDER` | API key needed | Model env var |
|---------------|----------------|---------------|
| `mock` (default) | no | — |
| `openai` | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| `gemini` | `GEMINI_API_KEY` | `GEMINI_MODEL` |
| `grok` | `GROK_API_KEY` | `GROK_MODEL` |
| `openrouter` | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` |

The `mock` provider returns canned text and is the default — local dev works with no keys.

## Subscriptions & webhooks

Razorpay is the source of truth for billing. Plans are defined in [plans.config.ts](apps/backend-core/src/subscription/plans.config.ts) (MONTHLY ₹300, YEARLY ₹3000) and reference Razorpay-side `planId`s — to change a price, create a new plan on Razorpay (existing plan amounts are immutable) and update the config.

### Flow

1. **Start** — `startSubscription(interval)` mutation creates a Razorpay subscription via the Razorpay SDK, persists a `Subscription` row with `status=CREATED`, and returns `{ razorpaySubscriptionId, razorpayKeyId, shortUrl }`.
2. **Checkout** — web opens Razorpay checkout with the returned key + subscription id.
3. **Webhook** — Razorpay POSTs lifecycle events (`subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, etc.) to `POST /webhooks/razorpay`. The controller verifies the signature with `RAZORPAY_WEBHOOK_SECRET`, then calls `WebhookService.handle`.
4. **Idempotency + tier sync** ([webhook.service.ts](apps/backend-core/src/subscription/webhook.service.ts)) — everything DB-side runs inside one Prisma transaction:
   - Insert `WebhookEvent { razorpayEventId }` — the unique constraint is the idempotency lock. Duplicate delivery → `P2002` → short-circuit with 200.
   - Update local `Subscription` (status, `currentPeriodStart`/`End`, `cancelledAt`).
   - Compute target tier and update `User.tier` if it changed. **Entitling statuses**: `AUTHENTICATED`, `ACTIVE`, `PENDING`, `HALTED`. **Demoting** (`CANCELLED`, `COMPLETED`, `EXPIRED`) drops the user to `FREE`.
   - Mark `processedAt`.
5. **Cache invalidation** — done *after* the transaction commits (Redis isn't transactional with Postgres). Worst-case staleness is the tier-cache TTL.
6. **Nightly cron backstop** — defensively downgrades any user whose latest subscription has `currentPeriodEnd < now()` and status != entitling, in case a `subscription.cancelled` webhook was missed.

A subtle point encoded in the status map: `CANCELLED` is **not** an entitling status. Razorpay only fires `subscription.cancelled` at the moment the cycle actually ends (for `cancel_at_cycle_end: true`), so by the time the webhook arrives the paid window is over and the tier must drop to FREE. `HALTED` *is* entitling — failed payment retries are still inside the paid cycle and may recover.

## Caching strategy

All Redis traffic flows through `CacheService` from `@litecode/cache`. Key conventions:

- Keys are minted by [cache.keys.ts](packages/cache/src/cache.keys.ts) — never inline.
- Naming: `<namespace>:<subkey>:<version>:<dims>`. Bump the version when the payload shape changes incompatibly.
- TTLs vary by entry — long for rarely-changing data (24h for code-template existence), shorter for hot lists.

What's cached today:

| Key | Notes |
|-----|-------|
| `problems:list:v2:t=<tier>:d=<diff>:p=<n>:l=<n>` | Public problem list slice, partitioned by viewer tier. Per-user solved/attempted flags are overlaid at the resolver from `userSolvedMap` and are **not** in this key. |
| `problem:v2:<slug>` | Public problem detail. |
| `topics:v1:p=<n>:l=<n>` | Active topics list. |
| `template:v1:<problemId>:<language>` | `(problemId, language)` code-template existence — 24h TTL, invalidated by `admin.setCodeTemplate`. |
| `user:<id>:solved-map` | Per-user map of solved/attempted problem ids. Invalidated whenever a verdict lands. |
| `user:<id>:tier:v1` | Per-user subscription tier (FREE / PREMIUM). Invalidated by webhook handlers and subscription mutations. |

Pattern deletes use `SCAN` (never `KEYS`) so invalidation doesn't block Redis on large key spaces.

## Setup

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** 9
- **Postgres** (any 14+; managed or local)
- **Redis** (any 6+; managed or local). Used for both BullMQ queues and the cache layer — same instance is fine.
- **Judge backend** — for local dev, the easiest path is a **self-hosted Piston** instance (`docker run` from the [engineer-man/piston](https://github.com/engineer-man/piston) repo). Alternatively, sign up for JDoodle (200 credits/day free) or a RapidAPI Judge0 key.
- **Razorpay account** (test mode) — only required if you want to exercise subscriptions / webhooks. Skip for now and the `/plans` endpoint just won't have real plan IDs.

### 1. Install dependencies

```sh
pnpm install
```

### 2. Configure environment

Copy each `.env.example` to `.env` and fill in:

- `apps/backend-core/.env`
- `apps/backend-secondary/.env`
- `apps/web/.env`
- `packages/db/.env`

The same `DATABASE_URL` must appear in all three backend env files (the two backends share a database; `packages/db/.env` is used by the Prisma CLI).

Key variables:

| Variable | Where | What it does |
|----------|-------|--------------|
| `DATABASE_URL` | core, secondary, db | Postgres connection. **Same value in all three.** |
| `REDIS_URL` | core, secondary | Used by both BullMQ and the cache layer. Same instance. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | core | Auth token signing. |
| `BULL_BOARD_USER`, `BULL_BOARD_PASS` | core | Basic-auth for `/queues`. |
| `RAZORPAY_KEY_ID`, `_SECRET`, `_WEBHOOK_SECRET` | core | Razorpay API + webhook signature verification. |
| `AI_PROVIDER` | core | `mock` \| `openai` \| `gemini` \| `grok` \| `openrouter`. Defaults to `mock` (no key needed). |
| `JUDGE_PROVIDER` | secondary | `jdoodle` \| `piston` \| `judge0`. |
| `JDOODLE_CLIENT_ID`, `_CLIENT_SECRET` | secondary | Required if `JUDGE_PROVIDER=jdoodle`. |
| `PISTON_BASE_URL` | secondary | Point at your self-hosted Piston. The public `emkc.org` instance is whitelist-only since 2026-02-15. |
| `JUDGE0_RAPIDAPI_KEY`, `_HOST` | secondary | Required if `JUDGE_PROVIDER=judge0`. |
| `VITE_API_URL` | web | Base URL of `backend-core`. Defaults to `http://localhost:3000`. |

### 3. Database

From the repo root:

```sh
pnpm --filter @litecode/db generate
pnpm --filter @litecode/db migrate
```

Seed initial data:

```sh
node packages/db/seed/seed_admin.js    # creates a bootstrap admin
node packages/db/seed/seed_topics.js   # creates the default Discuss topics
```

### 4. Run

Everything in parallel via Turborepo:

```sh
pnpm dev
```

Or per-app:

```sh
pnpm --filter backend-core dev
pnpm --filter backend-secondary dev
pnpm --filter web dev
```

### 5. Verify

- **GraphQL Playground** — http://localhost:3000/graphql
- **Bull-Board** — http://localhost:3000/queues (basic auth)
- **Web app** — http://localhost:5173

To exercise Razorpay webhooks locally, expose `backend-core` via a tunnel (ngrok, cloudflared, etc.) and register the tunnel URL + `/webhooks/razorpay` in the Razorpay dashboard with `RAZORPAY_WEBHOOK_SECRET`.

## API surface

- **Primary**: GraphQL at `POST /graphql`. Schema is generated from code-first decorators on every boot and written to [apps/backend-core/schema.gql](apps/backend-core/schema.gql) — committed so it's diffable.
- **REST**:
  - `POST /webhooks/razorpay` — Razorpay lifecycle webhook.
  - `GET /health` — health check.
  - `/queues/*` — Bull-Board UI (basic-auth gated).
  - Auth controller endpoints for login / signup / admin-invitation acceptance.
