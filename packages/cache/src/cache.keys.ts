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
  // userSolvedMap; they are NOT part of this key.
  problemsList(params: {
    difficulty: Nullable<string>;
    page: number;
    limit: number;
  }): string {
    return `problems:list:v1:d=${normalize(params.difficulty)}:p=${params.page}:l=${params.limit}`;
  },
  problemsListPattern(): string {
    return 'problems:list:v1:*';
  },

  // ---- Public problem detail by slug ----
  problemBySlug(slug: string): string {
    return `problem:v1:${slug}`;
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
};
