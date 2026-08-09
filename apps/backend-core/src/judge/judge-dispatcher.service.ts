import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  JUDGE_EXCHANGE,
  JUDGE_ROUTING_KEYS,
  JudgeJob,
  JudgeLane,
} from '@litecode/queue';

/**
 * The only place in backend-core that knows grading jobs travel over AMQP.
 *
 * Callers say `dispatch(job)`; they don't see an exchange, a routing key, or a
 * broker. That keeps the transport swappable — moving to NATS or Redis Streams
 * would touch this file and nothing else.
 */
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
      // Deliberately swallowed.
      //
      // The Submission row already exists as PENDING, and the sweeper
      // re-enqueues anything still pending after a couple of minutes. Throwing
      // here would surface a broker blip to the user as "the submit button is
      // broken" instead of "grading starts half a minute late".
      //
      // This only works because the sweeper covers PENDING, not just RUNNING.
      this.logger.error(
        `publish failed for ${job.jobId}: ${(err as Error).message} — leaving PENDING for the sweeper`,
      );
    }
  }
}
