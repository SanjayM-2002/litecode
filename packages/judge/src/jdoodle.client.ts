import { JudgeClient } from './judge.interface';
import { JudgeRunRequest, JudgeRunResult, JudgeStatusCode } from './types';
import { getJDoodleLanguageSpec } from './jdoodle-language-map';

export interface JDoodleConfig {
  /** e.g. https://api.jdoodle.com/v1 */
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /**
   * When true, log the assembled request and throw without contacting JDoodle.
   * Lets you iterate on driver templates without burning credits; the thrown error
   * causes BullMQ to retry per the queue's `attempts` config, so the job stays alive.
   */
  dryRun?: boolean;
}

interface JDoodleExecuteResponse {
  output?: string;
  error?: string | null;
  statusCode?: number;
  memory?: string | null;
  cpuTime?: string | null;
  isExecutionSuccess?: boolean;
  isCompiled?: boolean;
  compilationStatus?: string | null;
}

/**
 * JDoodle Compiler REST API client (https://www.jdoodle.com/docs/compiler-apis/).
 *
 * Things to know vs. Judge0:
 *   - No per-request timeout/memory knobs — JDoodle enforces its own platform limits.
 *     The grader still uses our limits to do its own TLE check post-hoc.
 *   - No expected-output comparison — grader does its own diff.
 *   - Auth is via clientId/clientSecret in the JSON body (not headers).
 *   - Combined output: stdout and stderr are concatenated into the single `output` field.
 *   - TLE/MLE are surfaced as substrings inside `output` rather than typed status codes,
 *     so detection is heuristic.
 */
export class JDoodleClient implements JudgeClient {
  constructor(private readonly config: JDoodleConfig) {}

  async run(req: JudgeRunRequest): Promise<JudgeRunResult> {
    const spec = getJDoodleLanguageSpec(req.language);
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/execute`;

    const body = {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      script: req.sourceCode,
      stdin: req.stdin,
      language: spec.language,
      versionIndex: spec.versionIndex,
    };

    console.log('========== JDoodle request ==========');
    console.log(`URL:          ${url}`);
    console.log(`language:     ${spec.language} (versionIndex=${spec.versionIndex})`);
    console.log(`stdin:        ${req.stdin}`);
    console.log(`script bytes: ${req.sourceCode.length}`);
    console.log('--- assembled source ---');
    console.log(req.sourceCode);
    console.log('--- end source ---');

    if (this.config.dryRun) {
      throw new Error(
        'JDoodle dry-run enabled — request was logged but not sent. ' +
          'Set JDOODLE_DRY_RUN=false (or unset it) to send the request.',
      );
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`JDoodle network error: ${(err as Error).message}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`JDoodle HTTP ${response.status}: ${text}`);
    }
    

    const json = (await response.json()) as JDoodleExecuteResponse;
    console.log('JDoodle response:');
    console.dir(json, { depth: null });
    return mapResponse(json);
  }
}

function mapResponse(r: JDoodleExecuteResponse): JudgeRunResult {
  const output = nonEmpty(r.output ?? null);
  const isCompiled = r.isCompiled !== false; // default to true if missing
  const isExecutionSuccess = r.isExecutionSuccess === true;

  if (!isCompiled) {
    return {
      status: 'COMPILATION_ERROR',
      stdout: null,
      stderr: output,
      compileOutput: nonEmpty(r.compilationStatus ?? null) ?? output,
      timeSec: parseTime(r.cpuTime),
      memoryKb: parseMemory(r.memory),
      rawStatusDescription: r.compilationStatus ?? r.error ?? 'Compilation failed',
      rawStatusId: r.statusCode ?? null,
    };
  }

  const status: JudgeStatusCode = !isExecutionSuccess
    ? classifyFailure(output)
    : 'ACCEPTED';

  // On execution failure JDoodle puts the error message in `output`; map it to stderr
  // so the grader surfaces it on the submission record.
  const stdout = isExecutionSuccess ? output : null;
  const stderr = isExecutionSuccess ? null : output;

  return {
    status,
    stdout,
    stderr,
    compileOutput: null,
    timeSec: parseTime(r.cpuTime),
    memoryKb: parseMemory(r.memory),
    rawStatusDescription: r.error ?? null,
    rawStatusId: r.statusCode ?? null,
  };
}

function classifyFailure(output: string | null): JudgeStatusCode {
  if (!output) return 'RUNTIME_ERROR';
  const o = output.toLowerCase();
  if (o.includes('time limit') || o.includes('timed out')) return 'TIME_LIMIT_EXCEEDED';
  if (o.includes('memory limit') || o.includes('out of memory')) return 'MEMORY_LIMIT_EXCEEDED';
  return 'RUNTIME_ERROR';
}

function parseTime(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseMemory(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function nonEmpty(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const trimmed = s.length === 0 ? null : s;
  return trimmed;
}
