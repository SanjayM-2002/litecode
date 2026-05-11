import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  // Worker process — no HTTP listener. BullMQ workers tick in the background.
  await app.init();
  Logger.log('backend-secondary worker started — listening for queue jobs', 'Bootstrap');
}
bootstrap();
