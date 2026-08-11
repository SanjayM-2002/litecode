import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  JUDGE_EXCHANGE,
  JUDGE_ROUTING_KEYS,
  JudgeJob,
  JudgeLane,
} from '@litecode/queue';


@Injectable()
export class JudgeDispatcher {
  private readonly logger = new Logger(JudgeDispatcher.name);

  constructor(private readonly amqp: AmqpConnection) {}

  async dispatch(job: JudgeJob, lane: JudgeLane = 'default'): Promise<void> {
    const routingKey = JUDGE_ROUTING_KEYS[lane];

    try {
      await this.amqp.publish(JUDGE_EXCHANGE, routingKey, job, {
        messageId: job.jobId,
        persistent: true,
      });
      this.logger.debug(`dispatched ${job.jobId} → ${routingKey}`);
    } catch (err) {
      // The Submission row already exists as PENDING, and the sweeper
      // re-enqueues anything still pending after a couple of minutes.
      this.logger.error(
        `publish failed for ${job.jobId}: ${(err as Error).message} — leaving PENDING for the sweeper`,
      );
    }
  }
}
