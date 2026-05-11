/**
 * Outcome of a single Judge0 execution. Matches Judge0's status code semantics
 * but normalized to vendor-agnostic names.
 */
export type JudgeStatusCode =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'INTERNAL_ERROR';

export interface JudgeRunRequest {
  /** Full source code (driver + user code already merged). */
  sourceCode: string;
  /** Vendor-neutral language identifier; the client maps it to its own ID space. */
  language: 'CPP' | 'JAVA' | 'PYTHON' | 'JAVASCRIPT' | 'TYPESCRIPT' | 'GO' | 'RUST';
  /** Stdin to feed to the program. Typically a JSON-stringified positional arg array. */
  stdin: string;
  /** Optional expected stdout. If passed, the judge may compare itself; we still compare client-side as the source of truth. */
  expectedOutput?: string;
  /** Per-test-case CPU time limit, in seconds. */
  cpuTimeLimitSec: number;
  /** Wall time limit, in seconds. Conventionally 2× CPU. */
  wallTimeLimitSec: number;
  /** Per-test-case memory limit, in KB. */
  memoryLimitKb: number;
}

export interface JudgeRunResult {
  status: JudgeStatusCode;
  /** Captured stdout (normalized: trailing newline trimmed). */
  stdout: string | null;
  /** Captured stderr (compile or runtime errors). */
  stderr: string | null;
  /** Compiler output for COMPILATION_ERROR cases. */
  compileOutput: string | null;
  /** Wall time, in seconds. */
  timeSec: number | null;
  /** Peak memory, in KB. */
  memoryKb: number | null;
  /** Raw status description from the judge, for debugging. */
  rawStatusDescription: string | null;
  /** Vendor-specific status code, for debugging. */
  rawStatusId: number | null;
}
