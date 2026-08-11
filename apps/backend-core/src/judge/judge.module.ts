import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { JUDGE_EXCHANGE } from '@litecode/queue';
import { JudgeDispatcher } from './judge-dispatcher.service';


@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('AMQP_URL'),
        exchanges: [{ name: JUDGE_EXCHANGE, type: 'topic' }],
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  providers: [JudgeDispatcher],
  exports: [JudgeDispatcher],
})
export class JudgeModule {}
