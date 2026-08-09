import { Injectable } from '@nestjs/common';
import { PrismaService } from '@litecode/db';
import { SubmissionStatus } from '@litecode/shared-types';
import { HealthIndicator, ServiceCheck } from '../health.types';

/** A submission older than this and still ungraded is stuck, not merely queued. */
const STUCK_AFTER_MS = 2 * 60 * 1000;

/**
 * The signal that actually matters to users.
 *
 * Every other indicator answers "is the process alive". This one answers "are
 * verdicts flowing" — and those come apart: workers can be connected,
 * heartbeating and idle while nothing drains, or the broker can be green while
 * every job dead-letters.
 *
 * It's also why backlog AGE is the right metric rather than CPU. On a judge
 * fleet CPU sits near 100% whenever there is any work at all, so utilisation
 * tells you nothing about whether you're keeping up.
 *
 * Not critical: a backlog is a degradation, not a reason to stop serving.
 */
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
