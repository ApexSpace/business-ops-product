import { Injectable } from '@nestjs/common';
import {
  EmailMessage,
  EmailMessageStatus,
  EmailProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export interface CreateEmailMessageData {
  businessId?: string | null;
  contactId?: string | null;
  userId?: string | null;
  emailType: string;
  toEmail: string;
  fromEmail: string;
  replyTo?: string | null;
  subject: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface FindExistingForSendParams {
  businessId?: string | null;
  emailType: string;
  toEmail: string;
  entityType?: string | null;
  entityId?: string | null;
  idempotencyKey: string;
}

@Injectable()
export class EmailMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateEmailMessageData): Promise<EmailMessage> {
    return this.prisma.emailMessage.create({
      data: {
        businessId: data.businessId ?? null,
        contactId: data.contactId ?? null,
        userId: data.userId ?? null,
        emailType: data.emailType,
        toEmail: data.toEmail,
        fromEmail: data.fromEmail,
        replyTo: data.replyTo ?? null,
        subject: data.subject,
        status: EmailMessageStatus.QUEUED,
        provider: EmailProvider.RESEND,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        metadata: data.metadata,
        queuedAt: new Date(),
      },
    });
  }

  findById(id: string): Promise<EmailMessage | null> {
    return this.prisma.emailMessage.findUnique({ where: { id } });
  }

  findByProviderMessageId(
    providerMessageId: string,
  ): Promise<EmailMessage | null> {
    return this.prisma.emailMessage.findFirst({
      where: { providerMessageId },
    });
  }

  findExistingForSend(
    params: FindExistingForSendParams,
  ): Promise<EmailMessage | null> {
    const notFailed = { not: EmailMessageStatus.FAILED };

    const businessFilter =
      params.businessId === undefined ? {} : { businessId: params.businessId };

    return this.prisma.emailMessage
      .findFirst({
        where: {
          ...businessFilter,
          metadata: {
            path: ['idempotencyKey'],
            equals: params.idempotencyKey,
          },
          status: notFailed,
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((byKey) => {
        if (byKey) {
          return byKey;
        }
        if (!params.entityType || !params.entityId) {
          return null;
        }
        return this.prisma.emailMessage.findFirst({
          where: {
            ...businessFilter,
            emailType: params.emailType,
            entityType: params.entityType,
            entityId: params.entityId,
            toEmail: params.toEmail,
            status: notFailed,
          },
          orderBy: { createdAt: 'desc' },
        });
      });
  }

  updateStatus(
    id: string,
    data: {
      status: EmailMessageStatus;
      providerMessageId?: string | null;
      errorMessage?: string | null;
      sentAt?: Date | null;
      metadataPatch?: Record<string, unknown>;
    },
  ): Promise<EmailMessage> {
    return this.prisma.emailMessage
      .findUnique({ where: { id } })
      .then((existing) => {
        const currentMetadata = (existing?.metadata ?? {}) as Record<
          string,
          unknown
        >;
        const metadata = data.metadataPatch
          ? ({
              ...currentMetadata,
              ...data.metadataPatch,
            } as Prisma.InputJsonValue)
          : undefined;

        return this.prisma.emailMessage.update({
          where: { id },
          data: {
            status: data.status,
            ...(data.providerMessageId !== undefined
              ? { providerMessageId: data.providerMessageId }
              : {}),
            ...(data.errorMessage !== undefined
              ? { errorMessage: data.errorMessage }
              : {}),
            ...(data.sentAt !== undefined ? { sentAt: data.sentAt } : {}),
            ...(metadata !== undefined ? { metadata } : {}),
          },
        });
      });
  }

  mergeMetadata(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<EmailMessage> {
    return this.prisma.emailMessage
      .findUnique({ where: { id } })
      .then((existing) => {
        const currentMetadata = (existing?.metadata ?? {}) as Record<
          string,
          unknown
        >;
        return this.prisma.emailMessage.update({
          where: { id },
          data: {
            metadata: { ...currentMetadata, ...patch } as Prisma.InputJsonValue,
          },
        });
      });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      emailType?: string;
      status?: EmailMessageStatus;
      search?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<{ items: EmailMessage[]; total: number }> {
    const createdAtFilter =
      params.dateFrom || params.dateTo
        ? {
            createdAt: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {};

    const where: Prisma.EmailMessageWhereInput = {
      businessId,
      ...createdAtFilter,
      ...(params.emailType ? { emailType: params.emailType } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search?.trim()
        ? {
            OR: [
              {
                toEmail: {
                  contains: params.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                subject: {
                  contains: params.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma
      .$transaction([
        this.prisma.emailMessage.findMany({
          where,
          skip: params.skip,
          take: params.take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.emailMessage.count({ where }),
      ])
      .then(([items, total]) => ({ items, total }));
  }
}
