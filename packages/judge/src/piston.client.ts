import { JudgeClient } from './judge.interface';
import { JudgeRunRequest, JudgeRunResult, JudgeStatusCode } from './types';
import { getPistonLanguageSpec } from './piston-language-map';

export interface PistonConfig {
  /** e.g. https://emkc.org/api/v2/piston (public) or your self-hosted base URL. */
  baseUrl: string;
  /** Optional API key — required only by some self-hosted deployments behind a gateway. */
  apiKey?: string;
}

interface PistonStage {
  stdout: string;
  stderr: string;
  output: string;
  code: number | null;
  signal: string | null;
}

interface PistonExecuteResponse {
  language: string;
  version: string;
  run: PistonStage;
  compile?: PistonStage;
}

/**
 * Piston client (https://github.com/engineer-man/piston).
 *
 * Differences vs. Judge0 worth knowing:
 *   - Single synchronous /execute call returns compile+run in one go.
 *   - No execution-time or memory-usage fields are returned, so timeSec/memoryKb are null.
 *   - No native expected-output comparison; the grader does its own diff and converts a
 *     status of ACCEPTED here into ACCEPTED or WRONG_ANSWER downstream.
 *   - TLE is inferred from SIGKILL with no exit code (Piston enforces timeouts via SIGKILL).
 */
export class PistonClient implements JudgeClient {
  constructor(private readonly config: PistonConfig) {}

  async run(req: JudgeRunRequest): Promise<JudgeRunResult> {
    const spec = getPistonLanguageSpec(req.language);
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/execute`;

    const body = {
      language: spec.language,
      version: spec.version,
      files: [{ name: spec.filename, content: req.sourceCode }],
      stdin: req.stdin,
      run_timeout: Math.round(req.wallTimeLimitSec * 1000),
      compile_timeout: Math.round(req.wallTimeLimitSec * 1000),
      // Piston memory limits are in bytes; -1 means unlimited.
      run_memory_limit: req.memoryLimitKb > 0 ? req.memoryLimitKb * 1024 : -1,
      compile_memory_limit: -1,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: this.config.apiKey } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Piston network error: ${(err as Error).message}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Piston HTTP ${response.status}: ${text}`);
    }

    const json = (await response.json()) as PistonExecuteResponse;
    console.log('Piston response:');
    console.dir(json, { depth: null });
    return mapResponse(json);
  }
}

function mapResponse(r: PistonExecuteResponse): JudgeRunResult {
  const compile = r.compile;
  const run = r.run;

  if (compile && (compile.code !== 0 || compile.signal)) {
    return {
      status: 'COMPILATION_ERROR',
      stdout: nonEmpty(run?.stdout),
      stderr: nonEmpty(run?.stderr),
      compileOutput: nonEmpty(compile.output ?? compile.stderr ?? compile.stdout),
      timeSec: null,
      memoryKb: null,
      rawStatusDescription: `compile exit=${compile.code} signal=${compile.signal ?? 'none'}`,
      rawStatusId: null,
    };
  }

  const status = classifyRun(run);

  return {
    status,
    stdout: nonEmpty(run.stdout),
    stderr: nonEmpty(run.stderr),
    compileOutput: nonEmpty(compile?.output ?? null),
    timeSec: null,
    memoryKb: null,
    rawStatusDescription: `run exit=${run.code} signal=${run.signal ?? 'none'}`,
    rawStatusId: null,
  };
}

function classifyRun(run: PistonStage): JudgeStatusCode {
  // Piston enforces wall-clock timeouts by sending SIGKILL.
  if (run.signal === 'SIGKILL') return 'TIME_LIMIT_EXCEEDED';

  // Common runtime-failure signals.
  if (run.signal === 'SIGSEGV' || run.signal === 'SIGABRT' || run.signal === 'SIGFPE') {
    return 'RUNTIME_ERROR';
  }

  if (run.signal && run.signal !== 'SIGTERM') return 'RUNTIME_ERROR';
  if (run.code === null) return 'INTERNAL_ERROR';
  if (run.code !== 0) return 'RUNTIME_ERROR';

  // Clean exit. Output correctness is decided by the grader's own comparator.
  return 'ACCEPTED';
}

function nonEmpty(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  return s.length === 0 ? null : s;
}
