import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const auditLogActorSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

const auditLogActorInclude = {
  actor: { select: auditLogActorSelect },
} satisfies Prisma.AuditLogInclude;

const auditLogListInclude = {
  actor: { select: auditLogActorSelect },
  business: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.AuditLogInclude;

export type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: typeof auditLogActorInclude;
}>;

export type AuditLogWithRelations = Prisma.AuditLogGetPayload<{
  include: typeof auditLogListInclude;
}>;

export interface CreateAuditLogInput {
  actorUserId: string;
  businessId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAuditLogInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }

  findByBusinessId(
    businessId: string,
    skip: number,
    take: number,
    filters?: { action?: string },
  ): Promise<{ items: AuditLogWithActor[]; total: number }> {
    const where = {
      businessId,
      ...(filters?.action
        ? { action: { contains: filters.action, mode: 'insensitive' as const } }
        : {}),
    };

    return Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: auditLogActorInclude,
      }),
      this.prisma.auditLog.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findAll(
    skip: number,
    take: number,
    filters?: { businessId?: string; action?: string },
  ): Promise<{ items: AuditLogWithRelations[]; total: number }> {
    const where = {
      ...(filters?.businessId ? { businessId: filters.businessId } : {}),
      ...(filters?.action
        ? { action: { contains: filters.action, mode: 'insensitive' as const } }
        : {}),
    };

    return Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: auditLogListInclude,
      }),
      this.prisma.auditLog.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }
}
