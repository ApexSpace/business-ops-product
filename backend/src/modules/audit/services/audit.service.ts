import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogRepository } from '../repositories/audit-log.repository';

export interface AuditLogInput {
  actorUserId: string;
  businessId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.auditLogRepository.create({
      ...input,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    });
  }

  findByBusinessId(businessId: string, skip: number, take: number) {
    return this.auditLogRepository.findByBusinessId(businessId, skip, take);
  }

  findAll(
    skip: number,
    take: number,
    filters?: { businessId?: string; action?: string },
  ) {
    return this.auditLogRepository.findAll(skip, take, filters);
  }
}
