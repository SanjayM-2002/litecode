import { JudgeClient } from './judge.interface';
import { JudgeRunRequest, JudgeRunResult, JudgeStatusCode } from './types';
import { getJudge0LanguageId } from './language-map';

export interface RapidApiJudge0Config {
  baseUrl: string;          // e.g., https://judge0-ce.p.rapidapi.com
  rapidApiKey: string;
  rapidApiHost: string;     // e.g., judge0-ce.p.rapidapi.com
}

interface Judge0SubmissionResponse {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;        // seconds, returned as string
  memory: number | null;      // KB
  status: { id: number; description: string };
}

/**
 * Synchronous Judge0 client (RapidAPI hosted Community Edition).
 * Uses the ?wait=true query param so submissions return their final verdict in one call.
 */
export class RapidApiJudge0Client implements JudgeClient {
  constructor(private readonly config: RapidApiJudge0Config) {}

  async run(req: JudgeRunRequest): Promise<JudgeRunResult> {
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/submissions?base64_encoded=true&wait=true&fields=*`;

    const body = {
      source_code: toBase64(req.sourceCode),
      language_id: getJudge0LanguageId(req.language),
      stdin: toBase64(req.stdin),
      ...(req.expectedOutput !== undefined
        ? { expected_output: toBase64(req.expectedOutput) }
        : {}),
      cpu_time_limit: req.cpuTimeLimitSec,
      wall_time_limit: req.wallTimeLimitSec,
      memory_limit: req.memoryLimitKb,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': this.config.rapidApiKey,
          'X-RapidAPI-Host': this.config.rapidApiHost,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Judge0 network error: ${(err as Error).message}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Judge0 HTTP ${response.status}: ${text}`);
    }

    const json = (await response.json()) as Judge0SubmissionResponse;

    return {
      status: mapStatus(json.status?.id ?? 0),
      stdout: decodeMaybe(json.stdout),
      stderr: decodeMaybe(json.stderr),
      compileOutput: decodeMaybe(json.compile_output),
      timeSec: json.time !== null ? Number(json.time) : null,
      memoryKb: json.memory ?? null,
      rawStatusDescription: json.status?.description ?? null,
      rawStatusId: json.status?.id ?? null,
    };
  }
}

/**
 * Judge0 CE status IDs:
 *   1   = In Queue
 *   2   = Processing
 *   3   = Accepted
 *   4   = Wrong Answer
 *   5   = Time Limit Exceeded
 *   6   = Compilation Error
 *   7   = Runtime Error (SIGSEGV)
 *   8   = Runtime Error (SIGXFSZ)
 *   9   = Runtime Error (SIGFPE)
 *   10  = Runtime Error (SIGABRT)
 *   11  = Runtime Error (NZEC)
 *   12  = Runtime Error (Other)
 *   13  = Internal Error
 *   14  = Exec Format Error
 */
function mapStatus(id: number): JudgeStatusCode {
  switch (id) {
    case 3:
      return 'ACCEPTED';
    case 4:
      return 'WRONG_ANSWER';
    case 5:
      return 'TIME_LIMIT_EXCEEDED';
    case 6:
      return 'COMPILATION_ERROR';
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
    case 14:
      return 'RUNTIME_ERROR';
    default:
      return 'INTERNAL_ERROR';
  }
}

function toBase64(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}

function decodeMaybe(s: string | null): string | null {
  if (s === null || s === undefined) return null;
  try {
    return Buffer.from(s, 'base64').toString('utf8');
  } catch {
    return s;
  }
}
