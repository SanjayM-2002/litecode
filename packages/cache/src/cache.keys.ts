type Nullable<T> = T | null | undefined;

const normalize = (v: Nullable<string>): string => (v === null || v === undefined ? 'null' : v);

export const cacheKeys = {

  problemsList(params: {
    tier: string;
    difficulty: Nullable<string>;
    page: number;
    limit: number;
  }): string {
    return `problems:list:v2:t=${params.tier}:d=${normalize(params.difficulty)}:p=${params.page}:l=${params.limit}`;
  },

  problemsListPattern(): string {
    return 'problems:list:v2:*';
  },

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
  userSolvedMap(userId: string): string {
    return `user:${userId}:solved-map`;
  },

  // ---- Per-user subscription tier (FREE | PREMIUM) ----
  // Invalidated by webhook handlers and subscription mutations.
  userTier(userId: string): string {
    return `user:${userId}:tier:v1`;
  },

  // ---- Judge worker liveness ----
  // GET /health/deep.
  judgeHeartbeat(workerId: string): string {
    return `judge:heartbeat:v1:${workerId}`;
  },
  judgeHeartbeatPattern(): string {
    return 'judge:heartbeat:v1:*';
  },
};
