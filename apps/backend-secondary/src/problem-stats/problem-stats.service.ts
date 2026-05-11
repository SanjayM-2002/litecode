import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaService } from '@litecode/db';
import { Verdict } from '@litecode/shared-types';
import { UpdateProblemStatsJob } from '@litecode/queue';

@Injectable()
export class ProblemStatsService {
  private readonly logger = new Logger(ProblemStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async apply(job: UpdateProblemStatsJob): Promise<void> {
    const { submissionId, problemId, verdict } = job;
    const isAccepted = verdict === Verdict.ACCEPTED;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.problemStatsLedger.create({
          data: { submissionId, problemId },
        });
        await tx.problemStats.upsert({
          where: { problemId },
          create: {
            problemId,
            totalSubmissions: 1,
            acceptedSubmissions: isAccepted ? 1 : 0,
          },
          update: {
            totalSubmissions: { increment: 1 },
            ...(isAccepted ? { acceptedSubmissions: { increment: 1 } } : {}),
          },
        });
      });
      this.logger.log(
        `Stats applied: problem=${problemId} submission=${submissionId} verdict=${verdict}`,
      );
    } catch (err) {
      // Unique violation on the ledger PK = job already applied. Treat as success.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        this.logger.debug(
          `Stats already applied for submission ${submissionId}; skipping`,
        );
        return;
      }
      throw err;
    }
  }
}
