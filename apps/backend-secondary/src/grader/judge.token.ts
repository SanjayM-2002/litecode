/**
 * DI token for the JudgeClient. Allows swapping implementations (RapidAPI / self-hosted Judge0 / mocks)
 * without changing service code.
 */
export const JUDGE_CLIENT = Symbol('JUDGE_CLIENT');
