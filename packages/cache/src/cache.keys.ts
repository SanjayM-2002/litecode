// Centralized cache-key builders. All Redis keys used by the application
// must be created via this module so invalidation rules are auditable.
//
// Naming convention: `<namespace>:<subkey>:<version>:<dims>`.
// Bump the version segment when the cached payload shape changes
// incompatibly — old entries will simply miss and refill.

type Nullable<T> = T | null | undefined;

const normalize = (v: Nullable<string>): string => (v === null || v === undefined ? 'null' : v);

export const cacheKeys = {
  // ---- Public problem list (global slice) ----
  // Per-user solved/attempted flags are overlaid at the resolver from
  // userSolvedMap; they are NOT part of this key. `tier` partitions the
  // slice: FREE viewers see only FREE problems, PREMIUM viewers see all.
  problemsList(params: {
    tier: string;
    difficulty: Nullable<string>;
    page: number;
    limit: number;
  }): string {
    return `problems:list:v2:t=${params.tier}:d=${normalize(params.difficulty)}:p=${params.page}:l=${params.limit}`;
  },
  // DUPLICATED in apps/judge/internal/cache/cache.go — see problemBySlug below.
  problemsListPattern(): string {
    return 'problems:list:v2:*';
  },

  // ---- Public problem detail by slug ----
  // DUPLICATED in apps/judge/internal/cache/cache.go — the Go worker busts this
  // itself after writing a verdict. Bumping the version here without changing
  // it there leaves stale detail served forever, silently. Pinned by
  // apps/backend-core/src/common/cache-keys.contract.spec.ts.
  problemBySlug(slug: string): string {
    return `problem:v2:${slug}`;
  },

  // ---- Active topics list ----
  topicsList(params: { page: number; limit: number }): string {
    return `topics:v1:p=${params.page}:l=${params.limit}`;
  },
  topicsListPattern(): string {
    return 'topics:v1:*';
  },

  // ---- (problemId, language) code-template existence ----
  template(problemId: string, language: string): string {
    return `template:v1:${problemId}:${language}`;
  },
  templatePatternForProblem(problemId: string): string {
    return `template:v1:${problemId}:*`;
  },

  // ---- Per-user solved/attempted map ----
  // DUPLICATED in apps/judge/internal/cache/cache.go — see problemBySlug above.
  userSolvedMap(userId: string): string {
    return `user:${userId}:solved-map`;
  },

  // ---- Per-user subscription tier (FREE | PREMIUM) ----
  // Invalidated by webhook handlers and subscription mutations.
  userTier(userId: string): string {
    return `user:${userId}:tier:v1`;
  },

  // ---- Judge worker liveness ----
  // Written by the Go worker on a ticker with a TTL slightly longer than the
  // interval, so the key simply expires when a worker stops. Read by
  // GET /health/deep. Absence of any key means nothing is grading.
  judgeHeartbeat(workerId: string): string {
    return `judge:heartbeat:v1:${workerId}`;
  },
  judgeHeartbeatPattern(): string {
    return 'judge:heartbeat:v1:*';
  },
};
