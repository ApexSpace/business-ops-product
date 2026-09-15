import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessStatus, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { EntitlementService } from './entitlement.service';

@Injectable()
export class BusinessStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly entitlements: EntitlementService,
  ) {}

  async transition(params: {
    businessId: string;
    toStatus: BusinessStatus;
    reason: string;
    actor?: RequestUser | null;
    metadata?: Record<string, unknown>;
  }) {
    const reason = params.reason?.trim();
    if (!reason) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'A reason is required for status changes',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.prisma.business.findFirst({
      where: { id: params.businessId, deletedAt: null },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (business.status === params.toStatus) {
      return business;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.business.update({
        where: { id: params.businessId },
        data: { status: params.toStatus },
      });
      await tx.businessStatusLog.create({
        data: {
          businessId: params.businessId,
          fromStatus: business.status,
          toStatus: params.toStatus,
          reason,
          changedByUserId: params.actor?.id ?? null,
          metadata: (params.metadata ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
        },
      });
      return next;
    });

    await this.auditService.log({
      actorUserId: params.actor?.id ?? SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: params.businessId,
      action: 'business.status_changed',
      entityType: 'Business',
      entityId: params.businessId,
      metadata: {
        from: business.status,
        to: params.toStatus,
        reason,
      },
    });

    await this.entitlements.invalidate(params.businessId);
    return updated;
  }

  async suspend(businessId: string, reason: string, actor: RequestUser) {
    return this.transition({
      businessId,
      toStatus: BusinessStatus.SUSPENDED,
      reason,
      actor,
    });
  }

  async block(businessId: string, reason: string, actor: RequestUser) {
    return this.transition({
      businessId,
      toStatus: BusinessStatus.BLOCKED,
      reason,
      actor,
    });
  }

  async reinstate(businessId: string, reason: string, actor: RequestUser) {
    return this.transition({
      businessId,
      toStatus: BusinessStatus.ACTIVE,
      reason,
      actor,
    });
  }

  async listLogs(businessId: string, limit = 50) {
    return this.prisma.businessStatusLog.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        changedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }
}
