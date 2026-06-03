import { Injectable } from '@nestjs/common';
import {
  IntegrationResource,
  IntegrationResourceStatus,
  IntegrationResourceType,
  IntegrationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ConversationIntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findResourceByExternalId(
    externalId: string,
    type: IntegrationResourceType,
  ): Promise<IntegrationResource | null> {
    return this.prisma.integrationResource.findFirst({
      where: {
        externalId,
        type,
        status: IntegrationResourceStatus.ACTIVE,
        businessIntegration: {
          status: IntegrationStatus.CONNECTED,
        },
      },
      include: {
        businessIntegration: true,
      },
    });
  }

  findInstagramResourceByLinkedPageId(
    linkedPageId: string,
  ): Promise<IntegrationResource | null> {
    return this.prisma.integrationResource.findFirst({
      where: {
        providerKey: 'instagram',
        type: IntegrationResourceType.INSTAGRAM_ACCOUNT,
        status: IntegrationResourceStatus.ACTIVE,
        metadata: {
          path: ['linkedPageId'],
          equals: linkedPageId,
        },
      },
      include: {
        businessIntegration: true,
      },
    });
  }
}
