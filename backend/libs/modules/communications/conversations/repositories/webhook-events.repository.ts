import { Injectable } from '@nestjs/common';
import {
  Prisma,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class WebhookEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.WebhookEventCreateInput) {
    return this.prisma.webhookEvent.create({ data });
  }

  findById(id: string) {
    return this.prisma.webhookEvent.findUnique({ where: { id } });
  }

  findByProviderAndExternalId(
    provider: WebhookEventProvider,
    externalEventId: string,
  ) {
    return this.prisma.webhookEvent.findFirst({
      where: { provider, externalEventId },
      orderBy: { receivedAt: 'desc' },
    });
  }

  updateStatus(
    id: string,
    status: WebhookEventStatus,
    errorMessage?: string | null,
  ) {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        processedAt: new Date(),
      },
    });
  }

  resetForReprocessing(
    id: string,
    payload: Prisma.InputJsonValue,
  ) {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: {
        payload,
        status: WebhookEventStatus.RECEIVED,
        errorMessage: null,
        processedAt: null,
      },
    });
  }
}
