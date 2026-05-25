import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

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
  ): Promise<{ items: AuditLog[]; total: number }> {
    return Promise.all([
      this.prisma.auditLog.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where: { businessId } }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findAll(
    skip: number,
    take: number,
    filters?: { businessId?: string; action?: string },
  ): Promise<{ items: AuditLog[]; total: number }> {
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
        include: {
          actor: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          business: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }
}
