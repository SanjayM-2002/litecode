# @litecode/judge-engine


Consumes grading jobs from RabbitMQ, executes untrusted submissions in isolated
sandboxes, and writes verdicts **straight to Postgres**. Writing the verdict
itself — rather than publishing it back for NestJS to write — is what keeps
"was this graded?" answerable from a row, instead of from a message that gets
destroyed the moment it's acked.

## Layout

```
cmd/judge/          entrypoint and wiring
internal/
  config/           env → typed config, validated at boot
  logging/          slog setup + the numbered CHECKPOINT helper
  model/            domain types; CaseResult JSON must stay frontend-compatible
  db/               Postgres access (Prisma's quoted identifiers)
  queue/            RabbitMQ consumer with the reconnect loop
  runtime/          per-language knowledge (cpp-14, node-22)
  plan/             cost-based chunk planner
  compare/          port of output-comparator.ts
  sandbox/          Sandbox interface + isolate and local implementations
  grader/           the orchestrator
```

`internal/sandbox` never imports a litecode type. Keep it that way — it's the
piece with standalone value, and a clean boundary makes extracting it later a
morning's work rather than a rewrite.

## Running locally

Two modes, because **isolate is Linux-only** and macOS has no namespaces or
cgroups.

**Native — the daily loop.** Queue, database, planning, comparison and verdict
logic all work. JavaScript submissions run; C++ does not, because Apple clang
has no `bits/stdc++.h` and macOS doesn't support `-static`.

```bash
cp .env.example .env     # set JUDGE_SANDBOX=local
go mod tidy
make run
```

**Docker — for anything touching the sandbox.** Real isolate, real limits, real
cgroup metrics, and C++.

```bash
make docker
make docker-run
```

Run the container version whenever you touch `internal/sandbox` or
`internal/runtime`. Everything else, native.

## Debug checkpoints

`LOG_LEVEL=debug` emits ten numbered checkpoints per submission:

```
1  job_received       6  compiled / compile_skipped
2  claimed            7  chunks_planned
3  bundle_loaded      8  chunk_done          (once per chunk)
4  source_assembled   9  verdict_computed
5  box_opened        10  verdict_written
```

Trace one submission:

```bash
make run 2>&1 | grep CHECKPOINT | grep sub_01HXYZ
```

A run that stops before 10 with no error returned early somewhere — the last
checkpoint tells you exactly which stage.

## Prerequisites

**A scoped Postgres role.** This machine runs untrusted code and must not hold
the app's credentials:

```sql
CREATE ROLE litejudge LOGIN PASSWORD '...';
GRANT SELECT ON "Problem", "TestCase", "CodeTemplate" TO litejudge;
GRANT SELECT, UPDATE (status, verdict, "testResults", runtime_ms, memory_kb,
                      "errorMessage", "failedTestCaseId", "startedAt",
                      "completedAt") ON "Submission" TO litejudge;
```

**Drivers that loop.** The generated driver must read NDJSON from stdin until
EOF and print exactly one compact JSON value per case — that one-line-per-case
property is what makes failure attribution exact when chunked. The generators in
`apps/backend-core/src/admin/template-generator/` emit this shape. Any problem
whose `CodeTemplate.driverCode` predates that change will read one case and exit,
which the grader sees as a short output — regenerate those templates.

## Known gaps

- **Large (GCS-backed) test cases** — `stageChunk` returns an error for them.
  Needs an object-storage client plus the content-addressed local cache.
- **Per-case stdout when chunked** — a user's own prints are chunk-level.
  Re-running just the failing case in isolation would fix it for ~17ms, paid
  only on failure.
- **Retry ladder** — failures dead-letter immediately and rely on the sweeper.
  Real backoff needs quorum queues plus the delayed-message plugin, neither of
  which a shared CloudAMQP plan provides.
- **`ProblemStats`** — not yet updated in the verdict transaction.
- **Golden vectors** — the comparator now exists in Go *and* TypeScript. They
  need a shared fixture exercised by both test suites, or they drift and
  silently mis-grade.
