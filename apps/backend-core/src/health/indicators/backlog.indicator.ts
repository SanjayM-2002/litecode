import { Injectable } from '@nestjs/common';
import { PrismaService } from '@litecode/db';
import { SubmissionStatus } from '@litecode/shared-types';
import { HealthIndicator, ServiceCheck } from '../health.types';

const STUCK_AFTER_MS = 2 * 60 * 1000;

@Injectable()
export class BacklogIndicator implements HealthIndicator {
  readonly name = 'backlog';
  readonly critical = false;

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<ServiceCheck> {
    const started = Date.now();
    const cutoff = new Date(Date.now() - STUCK_AFTER_MS);

    const [inFlight, stuck, oldest] = await Promise.all([
      this.prisma.submission.count({
        where: {
          status: { in: [SubmissionStatus.PENDING, SubmissionStatus.RUNNING] },
        },
      }),
      this.prisma.submission.count({
        where: {
          status: { in: [SubmissionStatus.PENDING, SubmissionStatus.RUNNING] },
          createdAt: { lt: cutoff },
        },
      }),
      this.prisma.submission.findFirst({
        where: {
          status: { in: [SubmissionStatus.PENDING, SubmissionStatus.RUNNING] },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    const oldestAgeSec = oldest
      ? Math.round((Date.now() - oldest.createdAt.getTime()) / 1000)
      : 0;

    return {
      status: stuck > 0 ? 'degraded' : 'up',
      latencyMs: Date.now() - started,
      critical: false,
      inFlight,
      stuck,
      oldestAgeSec,
      ...(stuck > 0
        ? { message: `${stuck} submission(s) ungraded for over ${STUCK_AFTER_MS / 1000}s` }
        : {}),
    };
  }
}
