import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { JUDGE_EXCHANGE } from '@litecode/queue';
import { JudgeDispatcher } from './judge-dispatcher.service';

/**
 * The one module that knows RabbitMQ exists.
 *
 * The connection is registered HERE rather than in AppModule because
 * RabbitMQModule is not @Global() — it exports AmqpConnection to importers
 * only. Registering it at the root and expecting injection anywhere fails at
 * boot with "Nest can't resolve dependencies of the JudgeDispatcher".
 */
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('AMQP_URL'),
        exchanges: [{ name: JUDGE_EXCHANGE, type: 'topic' }],
        // Don't block app boot on the broker. With `wait: true` an unreachable
        // CloudAMQP instance would stop the API from starting at all — whereas
        // a failed publish just leaves the submission PENDING for the sweeper.
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  providers: [JudgeDispatcher],
  exports: [JudgeDispatcher],
})
export class JudgeModule {}
