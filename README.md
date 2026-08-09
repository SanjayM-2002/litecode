# LiteCode

A LeetCode-style coding judge platform built as a Turborepo monorepo. Users solve algorithmic problems in a browser-based Monaco editor, submissions are graded asynchronously by an in-house sandboxed execution engine, and premium users get AI-powered hints, conceptual help, and code roasts.

The project is a NestJS API (`backend-core`), a **Go judge worker** (`apps/judge`) that executes untrusted code inside [isolate](https://github.com/ioi/isolate), and a Vite + React 19 web app — connected by RabbitMQ for job handoff and Postgres for state, sharing typed packages for DB access, caching, and queue contracts.

## Features

- **Problem catalog & editor** — browse problems by topic / difficulty, solve in Monaco, multi-language support driven by per-problem `CodeTemplate`s.
- **In-house judge engine** — a Go worker running submissions under isolate with cgroup v2 limits. No third-party execution service, no per-request quota, and exact CPU / peak-memory / kill-reason readings from isolate's meta file.
- **Chunked execution** — test cases are batched into a small number of sandbox invocations rather than one per case, so a 25-case problem costs a handful of process starts instead of 25. Chunk sizing follows a cost model; cheap and expensive cases are never mixed.
- **Async grading pipeline** — `submitSolution` publishes to RabbitMQ; the judge claims the row, grades it, and writes the verdict plus aggregate counters in a single transaction.
- **AI assistance (premium)** — three modes: `hint` (one nudge, ≤80 words, no code), `help` (conceptual answer to a question, ≤200 words), `roast` (sharp review of *your own* submission). Pluggable providers: OpenAI, Gemini, Grok, OpenRouter, or `mock` for keyless local dev.
- **Subscriptions via Razorpay** — Razorpay-hosted checkout, webhook-driven tier sync, idempotent webhook log, and a nightly cron backstop that demotes users whose `currentPeriodEnd` has passed if a webhook was missed.
- **Discuss & Solutions** — per-problem editorial Solutions with replies, plus a general Discuss section organised by Topics.
- **Admin panel** — problem CRUD, template management, admin invitation flow with permission scoping.
- **Health endpoints** — `GET /health` for liveness, `GET /health/deep` for per-dependency status. Only Postgres is critical, so a Redis or broker outage reports `degraded` rather than pulling the instance out of a load balancer.
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
   │  ─ GET /health, GET /health/deep                                    │
   └───────┬──────────────────────────┬───────────────────┬──────────────┘
           │ publish                  │ read/write        │ get/set
           ▼                          ▼                   ▼
   ┌──────────────────┐      ┌──────────────────┐   ┌──────────────────┐
   │   RabbitMQ       │      │   Postgres       │   │   Redis (cache)  │
   │  exchange:       │      │   (Prisma)       │   │   cache-aside    │
   │   litecode       │      │   schema split   │   │   SCAN-based     │
   │   (topic)        │      │   across files   │   │   pattern delete │
   │  routing keys:   │      │                  │   │   + judge        │
   │   • judge.jobs.  │      └────────▲─────────┘   │     heartbeats   │
   │       default    │               │             └────────▲─────────┘
   │   • judge.jobs.  │               │                      │
   │       high       │               │ claim, verdict,      │ invalidate
   └────────┬─────────┘               │ stats (one tx)       │ on verdict
            │ consume                 │                      │
            ▼                         │                      │
   ┌─────────────────────────────────────────────────────────────────────┐
   │  apps/judge   (Go 1.24, Docker)                                     │
   │  ─ claim row → assemble source → compile once → chunk cases →       │
   │    execute → compare → write verdict + ProblemStats in ONE tx       │
   │  ─ publishes a heartbeat key to Redis, read by /health/deep         │
   └───────────────────────────┬─────────────────────────────────────────┘
                               │ exec
                               ▼
                  ┌────────────────────────────┐
                  │  isolate (in-process)      │
                  │  namespaces + cgroup v2    │
                  │  g++ (PCH) · node 22       │
                  └────────────────────────────┘

   External:  Razorpay  ──── webhook ───►  backend-core  /webhooks/razorpay
              AI provider ◄── HTTPS ──── backend-core (Premium-only, on demand)
```

The message body is a **claim check** — ids only. Test data never travels through the broker, because a broker holds messages in memory and a large test case would be an OOM waiting to happen. The judge reads everything it needs from Postgres.

The verdict is **written by the judge**, not mailed back. That's what keeps "was this graded?" answerable from a row that can't be consumed and destroyed, and it's why a lost message costs a re-grade rather than a lost result.

## Monorepo structure

```
apps/
  backend-core/        NestJS API: GraphQL + REST webhooks + health
  judge/               Go worker: sandboxed execution engine (isolate)
  web/                 React 19 + Vite + Tailwind + Monaco

packages/
  db/                  Prisma schema (split files), client, migrations, seeds
  cache/               Redis CacheService + centralized cache-key registry
  queue/               RabbitMQ topology + job payload types, Redis URL parser
  shared-types/        Cross-package enums/types (auth, problem, submission, discuss, profile)
  ui/                  Shared React components
  eslint-config/       Shared ESLint config
  typescript-config/   Shared tsconfig presets
```

`apps/judge` is a Go module inside the pnpm/Turborepo workspace. Turborepo treats any directory with a `package.json` as a package regardless of language, so the Go app participates in `turbo run build` with no special configuration.

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
- `judge` — the only module that knows RabbitMQ exists. `JudgeDispatcher` publishes the grading job; premium submissions route to `judge.jobs.high`.
- `health` — `GET /health` (liveness) and `GET /health/deep` (per-service).

### `apps/judge`

The execution engine. A single Go binary shipped as a Docker image containing `isolate`, `g++` with a precompiled `bits/stdc++.h`, and the `node` 22 binary. See [apps/judge/README.md](apps/judge/README.md) for internals.

Layout, one concern per package:

| Package | Responsibility |
|---|---|
| `sandbox` | `Sandbox`/`Box` interfaces + the isolate driver. Imports no litecode type, so it stays liftable. `local.go` is a no-isolation dev fallback for macOS. |
| `runtime` | Per-language knowledge — compile argv, run argv, process limits. Adding a language is a map entry. |
| `plan` | Chunk sizing. `T = sqrt(2·B·N/p)`, so chunk count grows as √N. Never mixes cost classes. |
| `grader` | Orchestrates one submission across 10 numbered checkpoints. |
| `compare` | Port of the TypeScript output comparator — 1e-9 relative float tolerance, key order irrelevant, array order significant. |
| `queue` | AMQP consumer. Manual acks, prefetch as the concurrency limiter, explicit reconnect loop. |
| `db` | pgx/v5 pool. Raw SQL against Prisma's quoted identifiers. |
| `cache` | Post-verdict Redis invalidation. |
| `heartbeat` | Liveness key for `/health/deep`. |

Key behaviours:

- **Compile once, run many.** The driver reads NDJSON from stdin — one compact JSON value per line — and writes one line per case. That one-line-per-case property is what makes failure attribution exact when many cases share a process: a mismatch on line 7 is case 7, and a process that dies after 6 lines died on case 7.
- **The box is recycled after compiling.** `cg-mem` is `memory.peak`, a kernel high-water mark that never decreases, and isolate reuses one cgroup per box. Without the recycle, the compiler's ~200 MB footprint is reported as the solution's memory usage.
- **Time is a total budget that drains.** `Problem.timeLimit_ms` covers the whole submission, not each case — a per-case limit isn't observable when one process runs many cases. Memory resets per chunk.
- **Idempotency lives in the database.** `Claim()` and `WriteVerdict()` are conditional UPDATEs guarded on `status <> 'GRADED'`, so a redelivered message is a no-op needing no coordination.

### `apps/web`

Vite + React 19 SPA. Routing via `react-router-dom@7`. Data fetching via TanStack Query over `graphql-request`. Editor via `@monaco-editor/react`. UI built on Radix primitives + Tailwind 4 (`tw-animate-css`). Auth state in Zustand.

Pages: Problems, ProblemDetail (split-pane editor + tabs), Submissions, Solutions pane, Discuss / Topics / DiscussPost / DiscussNew, Profile, Plans, Login, Signup.

### `packages/db`

Prisma 5 with the `prismaSchemaFolder` preview feature — the schema is split into [user](packages/db/prisma/schema/user.prisma), [problem](packages/db/prisma/schema/problem.prisma), [submission](packages/db/prisma/schema/submission.prisma), [solution](packages/db/prisma/schema/solution.prisma), [discuss](packages/db/prisma/schema/discuss.prisma), [topic](packages/db/prisma/schema/topic.prisma), [profile](packages/db/prisma/schema/profile.prisma), [subscription](packages/db/prisma/schema/subscription.prisma) files. Re-exports the generated client + a `PrismaService` Nest module.

### `packages/cache`

[CacheService](packages/cache/src/cache.service.ts) wraps ioredis with `get`, `set`, `del`, `delPattern` (SCAN-based, never `KEYS`), and a `getOrSet` cache-aside helper that skips writing nulls. Also exposes `ping()` for the health indicator — deliberately the one method that does *not* swallow errors, since a health check that reports success on failure is worse than none.

All keys are minted via [cache.keys.ts](packages/cache/src/cache.keys.ts), versioned (`v1`, `v2`) so payload-shape changes can be rolled out by bumping the version segment — old entries simply miss and refill.

### `packages/queue`

The RabbitMQ topology and job payload shapes ([index.ts](packages/queue/index.ts)): exchange `litecode` (topic), routing keys `judge.jobs.default` and `judge.jobs.high`, and the `JudgeJob` body.

**These constants are re-declared in `apps/judge/internal/queue/consumer.go`, and nothing enforces that they match.** A mismatch is silent in the worst way — the publish succeeds and a topic exchange discards the message with no error. Both files carry a comment pointing at the other.

Also exports `getRedisConnection(url)` for the cache layer.

## Cross-language contracts

Three things are duplicated between TypeScript and Go because no compiler spans both. Each is a silent failure if they drift:

| Contract | TypeScript | Go | Guard |
|---|---|---|---|
| Queue topology | [packages/queue/index.ts](packages/queue/index.ts) | `internal/queue/consumer.go` | comments only |
| Cache keys | [cache.keys.ts](packages/cache/src/cache.keys.ts) | `internal/cache/cache.go` | [contract spec](apps/backend-core/src/common/cache-keys.contract.spec.ts) |
| Heartbeat key + payload | [cache.keys.ts](packages/cache/src/cache.keys.ts), `judge.indicator.ts` | `internal/heartbeat/heartbeat.go` | comments only |

The dangerous edit is a **version segment**. Bumping `problem:v2` to `v3` in TypeScript is a correct, deliberate change that silently breaks the judge — it carries on deleting `v2` keys nobody reads while the API serves stale data forever. The contract spec pins the three keys the judge touches for exactly this reason.

A fourth contract, the driver's NDJSON shape, is enforced at runtime rather than statically: the generators in `apps/backend-core/src/admin/template-generator/` emit a looping driver, and `admin.setCodeTemplate` rejects a `driverCode` missing `{{USER_CODE}}`. Nothing can statically detect a driver that reads only one case — that one misgrades silently, which is why drivers should be generated rather than hand-written.

## Submission & grading flow

1. Web calls `submitSolution(input)` GraphQL mutation.
2. `SubmissionService.submit` ([submission.service.ts](apps/backend-core/src/submission/submission.service.ts)) runs the gauntlet:
   - Code length validation (max 65,536 chars).
   - Problem exists + is published.
   - Tier gate: if `problem.tier === PREMIUM` and user is FREE → `PROBLEM_REQUIRES_PREMIUM`.
   - Free-tier quota: FREE users capped at 5 submissions per problem.
   - `(problemId, language)` template existence is cache-aside (`template:v1:<problemId>:<language>`, TTL 24h, invalidated by `admin.setCodeTemplate`).
3. Submission row inserted with `status=PENDING`.
4. `JudgeDispatcher.dispatch` publishes `{ jobId, problemId }` to the `litecode` exchange — `judge.jobs.high` for premium users, `judge.jobs.default` otherwise.

   The publish **never throws**. A broker outage leaves the row `PENDING` for the sweeper rather than failing the mutation the user is watching.

5. The Go worker consumes it (checkpoint numbers are the `CHECKPOINT` log lines):
   1. `job_received`
   2. `claimed` — conditional `UPDATE … SET status='RUNNING' WHERE status <> 'GRADED'`. Losing this race means another worker has it; ack and stop.
   3. `bundle_loaded` — submission, problem limits, driver template, test cases ordered by `order`.
   4. `source_assembled` — `{{USER_CODE}}` replaced with the submission.
   5. `box_opened` — an isolate box, its id taken from the concurrency slot so two goroutines can never share one.
   6. `compiled` — one compile for the whole submission, with its own generous limits (compiles need seconds and hundreds of MB; runs need ~2s and 256MB). Then `box_recycled` for a clean cgroup.
   7. `chunks_planned` — cases grouped by the cost model.
   8. `chunk_done` (per chunk) — inputs staged as NDJSON, one sandbox run, output compared line-by-line. **Fail-fast** on the first execution failure or mismatch.
   9. `verdict_computed`
   10. `verdict_written` — verdict, `testResults`, aggregate `runtime_ms`/`memory_kb`, `failedTestCaseId`, `errorMessage`, plus the `ProblemStatsLedger` row and `ProblemStats` counters, **all in one transaction**.
6. Caches are invalidated after the commit: the user's solved-map, the problem detail, and every problem-list page.

### Failure handling

**Bad problem data** — missing template, no test cases, a driver without the placeholder — is permanent. It persists `INTERNAL_ERROR` and acks; retrying can't help.

**Infrastructure failures** return an error, and the message is `Nack`ed without requeue. Classic queues have no `x-delivery-limit`, so `requeue=true` would redeliver forever — a hot loop that also burns the message quota. The submission stays `RUNNING` for the sweeper.

**Duplicate delivery** is a no-op: both `Claim` and `WriteVerdict` are guarded conditional UPDATEs, and because the counters share `WriteVerdict`'s transaction they can't be double-applied either.

> **Not yet implemented:** the sweeper. Both recovery paths above currently rely on it, so a broker outage or an infrastructure failure leaves a submission stuck until it exists.

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
| `judge:heartbeat:v1:<workerId>` | Written by each Go worker every 10s with a 30s TTL; read by `/health/deep`. A stopped worker simply expires. |

The judge invalidates `user:<id>:solved-map`, `problem:v2:<slug>` and `problems:list:v2:*` itself after each verdict — see [Cross-language contracts](#cross-language-contracts).

Pattern deletes use `SCAN` (never `KEYS`) so invalidation doesn't block Redis on large key spaces.

## Setup

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** 9
- **Postgres** (any 14+; managed or local)
- **Redis** (any 6+; managed or local). Cache, rate limiting, and judge heartbeats.
- **RabbitMQ** — a local Docker container or a managed instance (CloudAMQP's free "Little Lemur" tier is sufficient for development).
- **Docker** — required to run the judge. It executes untrusted code under isolate, which needs Linux namespaces and cgroup v2; on macOS or Windows there is no native path.
- **Razorpay account** (test mode) — only required if you want to exercise subscriptions / webhooks. Skip for now and the `/plans` endpoint just won't have real plan IDs.

> On macOS you can run the judge natively with `JUDGE_SANDBOX=local` to exercise the queue, database and comparison paths — but that mode applies **no isolation whatsoever** and cannot compile C++ (Apple clang has no `bits/stdc++.h`). It logs a loud warning at startup. Never point it at real submissions.

### 1. Install dependencies

```sh
pnpm install
```

### 2. Configure environment

Copy each `.env.example` to `.env` and fill in:

- `apps/backend-core/.env`
- `apps/judge/.env`
- `apps/web/.env`
- `packages/db/.env`

`DATABASE_URL` points at the same database everywhere, but the judge's string is deliberately **not identical**: it runs in a container, so its host is `host.docker.internal` rather than `localhost`, and it should connect as a scoped role rather than the app user.

Key variables:

| Variable | Where | What it does |
|----------|-------|--------------|
| `DATABASE_URL` | core, judge, db | Postgres connection. Same database; judge uses a container-visible host. |
| `AMQP_URL` | core, judge | RabbitMQ. **Must be the same broker on both sides** — publisher and consumer have to meet. `backend-core` reads it with `getOrThrow`, so it won't boot without it. |
| `REDIS_URL` | core, judge | Cache + heartbeats. Optional for the judge; without it, it grades fine but reports as down in `/health/deep`. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | core | Auth token signing. |
| `RAZORPAY_KEY_ID`, `_SECRET`, `_WEBHOOK_SECRET` | core | Razorpay API + webhook signature verification. |
| `AI_PROVIDER` | core | `mock` \| `openai` \| `gemini` \| `grok` \| `openrouter`. Defaults to `mock` (no key needed). |
| `JUDGE_SANDBOX` | judge | `isolate` (real) or `local` (**no isolation**, dev only). Compose passes the env file, which overrides the image default — so this must be set explicitly. |
| `JUDGE_CONCURRENCY` | judge | Sandbox concurrency and isolate box-id pool size. Should be roughly `cores - 2`: sandboxes are CPU-bound, and oversubscribing inflates every measured runtime, which turns correct solutions into TLEs. |
| `JUDGE_QUEUE` | judge | Queue name, which doubles as the routing key. Leave as `judge.jobs.default` unless adding a second worker. |
| `VITE_API_URL` | web | Base URL of `backend-core`. Defaults to `http://localhost:3000`. |

### Optional: scoped database role for the judge

The judge runs untrusted code, so in anything beyond local development it should not connect as the app user:

```sql
CREATE ROLE litejudge LOGIN PASSWORD '…';
GRANT CONNECT ON DATABASE litecode TO litejudge;
GRANT USAGE ON SCHEMA public TO litejudge;
GRANT SELECT ON "Problem", "TestCase", "CodeTemplate" TO litejudge;
GRANT SELECT, UPDATE (status, verdict, "testResults", runtime_ms, memory_kb,
                      "errorMessage", "failedTestCaseId", "startedAt",
                      "completedAt") ON "Submission" TO litejudge;
GRANT INSERT ON "ProblemStatsLedger" TO litejudge;
GRANT INSERT, UPDATE ON "ProblemStats" TO litejudge;
```

Run these **after** migrating — you can't grant on tables that don't exist — and re-run them after any migration that adds a column the judge writes. New columns don't inherit column-level grants.

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

The TypeScript apps run natively; the judge runs in Docker.

```sh
pnpm --filter backend-core start:dev
pnpm --filter web dev

cd apps/judge && make up          # builds the image and runs the worker attached
```

Other judge targets: `make docker` (build only), `make logs`, `make down`, and `make shell` for a bash prompt in the same image — useful for diagnosing isolate and cgroups.

The first image build takes a few minutes: three apt stages, an isolate compile, and the ~150 MB precompiled-header step. After that it's cached unless `go.mod` changes.

### 5. Verify

- **GraphQL Playground** — http://localhost:3000/graphql
- **Web app** — http://localhost:5173
- **Health** — `curl -s localhost:3000/health/deep | jq`

A healthy judge startup looks like:

```
judge starting            sandbox=isolate concurrency=1 os=linux/arm64
isolate found             version=…
isolate preflight passed  box_root=/var/local/lib/isolate/0
postgres connected
judge ready
consuming                 queue=judge.jobs.default prefetch=1
```

The preflight runs a real `--init`/`--cleanup` round-trip before the consumer starts, so a broken cgroup setup fails at boot with isolate's own error message rather than surfacing later as a dead-lettered job.

Set `LOG_LEVEL=debug` to get the ten numbered `CHECKPOINT` lines per submission. `grep CHECKPOINT | grep <submissionId>` gives the full trace; fewer than ten with no error means something returned early.

To exercise Razorpay webhooks locally, expose `backend-core` via a tunnel (ngrok, cloudflared, etc.) and register the tunnel URL + `/webhooks/razorpay` in the Razorpay dashboard with `RAZORPAY_WEBHOOK_SECRET`.

## API surface

- **Primary**: GraphQL at `POST /graphql`. Schema is generated from code-first decorators on every boot and written to [apps/backend-core/schema.gql](apps/backend-core/schema.gql) — committed so it's diffable.
- **REST**:
  - `POST /webhooks/razorpay` — Razorpay lifecycle webhook.
  - `GET /health` — liveness. 200 whenever the process is up; never touches a dependency.
  - `GET /health/deep` — per-service status (Postgres, Redis, RabbitMQ, judge workers, submission backlog). Returns 503 **only** if a service marked `critical` is down — currently just Postgres. Everything else reports `degraded`, because a Redis outage means cache misses and a broker outage means grading pauses; neither is a reason to pull the instance out of a load balancer.
  - Auth controller endpoints for login / signup / admin-invitation acceptance.

