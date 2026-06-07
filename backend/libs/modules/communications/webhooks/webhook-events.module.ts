import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/core/database/prisma.module';
import { WebhookEventsRepository } from '../conversations/repositories/webhook-events.repository';

@Module({
  imports: [PrismaModule],
  providers: [WebhookEventsRepository],
  exports: [WebhookEventsRepository],
})
export class WebhookEventsModule {}
