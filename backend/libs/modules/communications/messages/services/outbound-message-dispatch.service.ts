import { Injectable, Logger } from '@nestjs/common';
import { AsyncJob, AsyncJobStatus, MessageStatus } from '@prisma/client';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { PrismaService } from '@app/core/database/prisma.service';
import { SendMessageProcessor } from '../workers/processors/send-message.processor';

@Injectable()
export class OutboundMessageDispatchService {
  private readonly logger = new Logger(OutboundMessageDispatchService.name);

  constructor(
    private readonly jobEnqueue: JobEnqueueService,
    private readonly sendMessageProcessor: SendMessageProcessor,
    private readonly prisma: PrismaService,
  ) {}

  async dispatch(
    payload: {
      messageId: string;
      businessId: string;
      conversationId: string;
    },
    idempotencyKey: string | undefined,
    actorUserId: string,
  ): Promise<{ asyncJob: AsyncJob }> {
    const { asyncJob, queued } = await this.jobEnqueue.enqueueSendMessage(
      payload,
      idempotencyKey,
      actorUserId,
    );

    if (queued) {
      return { asyncJob };
    }

    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      this.logger.error(
        `Failed to queue outbound message ${payload.messageId}; start Redis and the worker`,
      );
      return { asyncJob };
    }

    this.logger.warn(
      `Redis unavailable; sending message ${payload.messageId} inline (development fallback)`,
    );

    await this.sendMessageProcessor.process({
      messageId: payload.messageId,
      businessId: payload.businessId,
      asyncJobId: asyncJob.id,
    });

    return { asyncJob };
  }

  async recoverPendingOnStartup(): Promise<void> {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      return;
    }
    if (
      (process.env.OUTBOUND_MESSAGE_RECOVERY_ON_STARTUP ?? 'true').toLowerCase() ===
      'false'
    ) {
      return;
    }

    const pending = await this.prisma.conversationMessage.findMany({
      where: { status: MessageStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: 25,
      select: { id: true, businessId: true, conversationId: true },
    });

    if (pending.length === 0) {
      return;
    }

    this.logger.log(`Recovering ${pending.length} outbound message(s) stuck in PENDING`);

    for (const message of pending) {
      const asyncJob = await this.prisma.asyncJob.findFirst({
        where: {
          entityType: 'ConversationMessage',
          entityId: message.id,
          status: { in: [AsyncJobStatus.QUEUED, AsyncJobStatus.ACTIVE] },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (!asyncJob) {
        continue;
      }

      try {
        await this.sendMessageProcessor.process({
          messageId: message.id,
          businessId: message.businessId,
          asyncJobId: asyncJob.id,
        });
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : 'Recovery send failed';
        this.logger.warn(
          `Outbound message recovery failed for ${message.id}: ${detail}`,
        );
      }
    }
  }
}
