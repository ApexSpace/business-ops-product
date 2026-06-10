import { Injectable } from '@nestjs/common';
import {
  BusinessSubscriptionEvent,
  BusinessSubscriptionEventSeverity,
  BusinessSubscriptionEventSource,
  BusinessSubscriptionEventType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type CreateSubscriptionEventInput = {
  businessId: string;
  subscriptionId?: string | null;
  eventType: BusinessSubscriptionEventType;
  title: string;
  description?: string | null;
  fromState?: Prisma.InputJsonValue;
  toState?: Prisma.InputJsonValue;
  source?: Prisma.BusinessSubscriptionEventCreateInput['source'];
  severity?: Prisma.BusinessSubscriptionEventCreateInput['severity'];
  correlationId: string;
  actionKey?: string | null;
  paymentId?: string | null;
  reason?: string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
  createdById?: string | null;
  createdByNameSnapshot?: string | null;
};

@Injectable()
export class BusinessSubscriptionEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: CreateSubscriptionEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessSubscriptionEvent> {
    const client = tx ?? this.prisma;
    return client.businessSubscriptionEvent.create({ data });
  }

  createMany(
    events: CreateSubscriptionEventInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.BatchPayload> {
    const client = tx ?? this.prisma;
    return client.businessSubscriptionEvent.createMany({ data: events });
  }

  findById(id: string): Promise<BusinessSubscriptionEvent | null> {
    return this.prisma.businessSubscriptionEvent.findUnique({ where: { id } });
  }

  findMany(params: {
    businessId: string;
    eventType?: BusinessSubscriptionEventType;
    eventTypes?: BusinessSubscriptionEventType[];
    source?: BusinessSubscriptionEventSource;
    severity?: BusinessSubscriptionEventSeverity;
    subscriptionStatus?: SubscriptionStatus;
    from?: Date;
    to?: Date;
    search?: string;
    cursor?: string;
    limit: number;
  }): Promise<BusinessSubscriptionEvent[]> {
    const eventTypeFilter = params.eventTypes?.length
      ? { eventType: { in: params.eventTypes } }
      : params.eventType
        ? { eventType: params.eventType }
        : {};

    const searchWhere = buildSubscriptionEventSearchWhere(params.search);

    const where: Prisma.BusinessSubscriptionEventWhereInput = {
      businessId: params.businessId,
      ...eventTypeFilter,
      ...(params.source ? { source: params.source } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
      ...(params.subscriptionStatus
        ? buildSubscriptionStatusWhere(params.subscriptionStatus)
        : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
      ...(searchWhere ?? {}),
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    };

    return this.prisma.businessSubscriptionEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
    });
  }
}

function buildSubscriptionStatusWhere(
  subscriptionStatus: SubscriptionStatus,
): Prisma.BusinessSubscriptionEventWhereInput {
  return {
    OR: [
      {
        fromState: {
          path: ['subscriptionStatus'],
          equals: subscriptionStatus,
        },
      },
      {
        toState: {
          path: ['subscriptionStatus'],
          equals: subscriptionStatus,
        },
      },
    ],
  };
}

function buildSubscriptionEventSearchWhere(
  search?: string,
): Prisma.BusinessSubscriptionEventWhereInput | undefined {
  const query = search?.trim();
  if (!query) {
    return undefined;
  }

  const matchingEventTypes = (
    Object.values(
      BusinessSubscriptionEventType,
    ) as BusinessSubscriptionEventType[]
  ).filter((type) => type.toLowerCase().includes(query.toLowerCase()));

  const or: Prisma.BusinessSubscriptionEventWhereInput[] = [
    { title: { contains: query, mode: 'insensitive' } },
    { description: { contains: query, mode: 'insensitive' } },
    { notes: { contains: query, mode: 'insensitive' } },
    { createdByNameSnapshot: { contains: query, mode: 'insensitive' } },
    {
      fromState: {
        path: ['planTierName'],
        string_contains: query,
      },
    },
    {
      toState: {
        path: ['planTierName'],
        string_contains: query,
      },
    },
    {
      fromState: {
        path: ['planTierId'],
        string_contains: query,
      },
    },
    {
      toState: {
        path: ['planTierId'],
        string_contains: query,
      },
    },
  ];

  if (matchingEventTypes.length > 0) {
    or.push({ eventType: { in: matchingEventTypes } });
  }

  return { OR: or };
}
