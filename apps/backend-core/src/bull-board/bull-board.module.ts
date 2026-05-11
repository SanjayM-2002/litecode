import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule as BullBoardNestModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QUEUES } from '@litecode/queue';
import { basicAuthMiddleware } from './basic-auth.middleware';

export const BULL_BOARD_ROUTE = '/admin/queues';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.gradeSubmission },
      { name: QUEUES.updateRating },
      { name: QUEUES.updateProblemStats },
    ),
    BullBoardNestModule.forRoot({
      route: BULL_BOARD_ROUTE,
      adapter: ExpressAdapter,
    }),
    BullBoardNestModule.forFeature(
      { name: QUEUES.gradeSubmission, adapter: BullMQAdapter },
      { name: QUEUES.updateRating, adapter: BullMQAdapter },
      { name: QUEUES.updateProblemStats, adapter: BullMQAdapter },
    ),
  ],
})
export class BullBoardModule implements NestModule {
  constructor(private readonly config: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    const user = this.config.get<string>('BULL_BOARD_USER');
    const pass = this.config.get<string>('BULL_BOARD_PASS');
    if (!user || !pass) return;

    consumer
      .apply(basicAuthMiddleware(user, pass, 'Bull Board'))
      .forRoutes(
        { path: BULL_BOARD_ROUTE, method: RequestMethod.ALL },
        { path: `${BULL_BOARD_ROUTE}/(.*)`, method: RequestMethod.ALL },
      );
  }
}
