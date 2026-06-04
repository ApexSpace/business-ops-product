import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { SchedulerModule } from './scheduler.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SchedulerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.get(Logger).log('Scheduler process started');
}

void bootstrap();
