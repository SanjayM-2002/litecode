import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CacheService, cacheKeys } from '@litecode/cache';
import { PrismaService, Submission, TestCase, Prisma } from '@litecode/db';
import { Language, SubmissionStatus, Verdict } from '@litecode/shared-types';
import {
  JudgeClient,
  JudgeRunResult,
  JudgeStatusCode,
} from '@litecode/judge';
import { QUEUES, UpdateProblemStatsJob } from '@litecode/queue';
import { Queue } from 'bullmq';
import { JUDGE_CLIENT } from './judge.token';
import { assembleSource } from './source-assembler';
import { outputsMatch } from './output-comparator';

interface PerCaseResult {
  testCaseId: string;
  isSample: boolean;
  verdict: Verdict;
  runtime_ms: number | null;
  memory_kb: number | null;
  stdout: string | null;
  stderr: string | null;
  expected: unknown;
}

@Injectable()
export class GraderService {
  private readonly logger = new Logger(GraderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    @Inject(JUDGE_CLIENT) private readonly judge: JudgeClient,
    @InjectQueue(QUEUES.updateProblemStats)
    private readonly statsQueue: Queue<UpdateProblemStatsJob>,
  ) {}

  async grade(submissionId: string): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: {
          include: {
            templates: true,
            testCases: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!submission) {
      this.logger.warn(`Submission ${submissionId} not found — skipping`);
      return;
    }

    if (submission.status === SubmissionStatus.GRADED) {
      this.logger.warn(`Submission ${submissionId} already graded — skipping`);
      return;
    }

    const template = submission.problem.templates.find(
      (t) => t.language === submission.language,
    );
    if (!template) {
      await this.markFailed(
        submission,
        Verdict.INTERNAL_ERROR,
        `No CodeTemplate for language ${submission.language}`,
      );
      return;
    }

    let fullSource: string;
    try {
      fullSource = assembleSource(template.driverCode, submission.code);
    } catch (err) {
      await this.markFailed(
        submission,
        Verdict.INTERNAL_ERROR,
        (err as Error).message,
      );
      return;
    }

    if (submission.problem.testCases.length === 0) {
      await this.markFailed(
        submission,
        Verdict.INTERNAL_ERROR,
        'Problem has no test cases',
      );
      return;
    }

    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { status: SubmissionStatus.RUNNING, startedAt: new Date() },
    });

    const perCase: PerCaseResult[] = [];
    let aggregateVerdict: Verdict = Verdict.ACCEPTED;
    let firstFailure: PerCaseResult | null = null;
    let maxRuntime = 0;
    let maxMemory = 0;
    let errorMessage: string | null = null;

    for (const tc of submission.problem.testCases) {
      const stdin = JSON.stringify(tc.inlineInput);

      let result: JudgeRunResult;
      try {
        result = await this.judge.run({
          sourceCode: fullSource,
          language: submission.language as Language,
          stdin,
          cpuTimeLimitSec: submission.problem.timeLimit_ms / 1000,
          wallTimeLimitSec: (submission.problem.timeLimit_ms / 1000) * 2,
          memoryLimitKb: submission.problem.memoryLimit_kb,
        });
      } catch (err) {
        // Infrastructure failure — abort with INTERNAL_ERROR.
        // BullMQ will retry the whole job per its `attempts` config.
        const msg = (err as Error).message;
        this.logger.error(`Judge call failed for ${submission.id}: ${msg}`);
        throw err;
      }

      const verdict = this.classifyVerdict(result, tc);
      const runtimeMs = result.timeSec !== null ? Math.round(result.timeSec * 1000) : null;
      const caseResult: PerCaseResult = {
        testCaseId: tc.id,
        isSample: tc.isSample,
        verdict,
        runtime_ms: runtimeMs,
        memory_kb: result.memoryKb,
        stdout: result.stdout,
        stderr: result.stderr ?? result.compileOutput,
        expected: tc.inlineOutput,
      };
      perCase.push(caseResult);

      if (runtimeMs !== null) maxRuntime = Math.max(maxRuntime, runtimeMs);
      if (result.memoryKb !== null) maxMemory = Math.max(maxMemory, result.memoryKb);

      if (verdict !== Verdict.ACCEPTED) {
        aggregateVerdict = verdict;
        firstFailure = caseResult;
        errorMessage =
          verdict === Verdict.COMPILATION_ERROR
            ? result.compileOutput ?? result.stderr
            : result.stderr;
        break; // fail-fast
      }
    }

    await this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.GRADED,
        verdict: aggregateVerdict,
        testResults: perCase as unknown as Prisma.InputJsonValue,
        runtime_ms: maxRuntime > 0 ? maxRuntime : null,
        memory_kb: maxMemory > 0 ? maxMemory : null,
        failedTestCaseId: firstFailure?.testCaseId ?? null,
        errorMessage,
        completedAt: new Date(),
      },
    });

    // Verdict landed → the user's solved/attempted flags may have changed.
    await this.cache.del(cacheKeys.userSolvedMap(submission.userId));

    this.logger.log(
      `Submission ${submission.id} → ${aggregateVerdict} (runtime ${maxRuntime}ms, memory ${maxMemory}KB)`,
    );

    // Fire side-effect job: increment Problem aggregate counters.
    // Consumer is idempotent via ProblemStatsLedger, so at-least-once delivery is safe.
    await this.statsQueue.add(
      'apply',
      {
        submissionId: submission.id,
        problemId: submission.problemId,
        verdict: aggregateVerdict,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    );
  }

  private classifyVerdict(result: JudgeRunResult, tc: TestCase): Verdict {
    const status: JudgeStatusCode = result.status;
    if (status === 'COMPILATION_ERROR') return Verdict.COMPILATION_ERROR;
    if (status === 'TIME_LIMIT_EXCEEDED') return Verdict.TIME_LIMIT_EXCEEDED;
    if (status === 'MEMORY_LIMIT_EXCEEDED') return Verdict.MEMORY_LIMIT_EXCEEDED;
    if (status === 'RUNTIME_ERROR') return Verdict.RUNTIME_ERROR;
    if (status === 'INTERNAL_ERROR') return Verdict.INTERNAL_ERROR;

    // status is ACCEPTED at the judge level — now check actual output match
    if (status === 'ACCEPTED') {
      if (outputsMatch(result.stdout, tc.inlineOutput)) return Verdict.ACCEPTED;
      return Verdict.WRONG_ANSWER;
    }

    if (status === 'WRONG_ANSWER') return Verdict.WRONG_ANSWER;
    return Verdict.INTERNAL_ERROR;
  }

  private async markFailed(
    submission: Submission,
    verdict: Verdict,
    errorMessage: string,
  ): Promise<void> {
    this.logger.warn(`Submission ${submission.id} → ${verdict}: ${errorMessage}`);
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.GRADED,
        verdict,
        errorMessage,
        completedAt: new Date(),
      },
    });
    // A failed-grading verdict still flips the user from unattempted → attempted
    // (the submission row exists). Bust the solved-map so the next list/detail
    // request re-derives flags.
    await this.cache.del(cacheKeys.userSolvedMap(submission.userId));
  }
}
