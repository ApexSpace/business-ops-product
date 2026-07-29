import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BusinessLifecycleStage,
  BusinessStatus,
  BusinessType,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { BusinessProvisioningService } from './business-provisioning.service';

export type CreateBusinessFromLeadInput = {
  /** Ops business that owns the campaign pipeline (INTERNAL). */
  opsBusinessId: string;
  pipelineId: string;
  pipelineStageId: string;
  name: string;
  email?: string | null;
  phoneCountryCode?: string | null;
  phoneNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  actorUserId?: string | null;
};

export type MoveLifecycleStageInput = {
  businessId: string;
  pipelineStageId: string;
  actorUserId?: string | null;
};

@Injectable()
export class BusinessLifecycleService {
  private readonly logger = new Logger(BusinessLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: BusinessProvisioningService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates a TENANT Business labeled LEAD and places it on an ops campaign stage.
   * Does not provision Stripe/MedSpa/subscription access.
   */
  async createFromLead(input: CreateBusinessFromLeadInput) {
    const name = input.name.trim();
    if (!name) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Business name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stage = await this.requireOpsStage(
      input.opsBusinessId,
      input.pipelineId,
      input.pipelineStageId,
    );

    const lifecycleStage =
      stage.mapsToLifecycleStage ?? BusinessLifecycleStage.LEAD;

    const business = await this.prisma.business.create({
      data: {
        name,
        type: BusinessType.TENANT,
        status: BusinessStatus.NOT_ACTIVE,
        lifecycleStage,
        lifecyclePipelineId: stage.pipelineId,
        lifecyclePipelineStageId: stage.id,
        email: input.email?.trim() || null,
        phoneCountryCode: input.phoneCountryCode?.trim() || null,
        phoneNumber: input.phoneNumber?.trim() || null,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        displayName:
          [input.firstName, input.lastName]
            .map((p) => p?.trim())
            .filter(Boolean)
            .join(' ') || null,
        createdById: input.actorUserId ?? null,
      },
    });

    await this.auditService.log({
      actorUserId: input.actorUserId ?? SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: input.opsBusinessId,
      action: 'business.created_from_lead',
      entityType: 'Business',
      entityId: business.id,
      metadata: {
        lifecycleStage: business.lifecycleStage,
        pipelineId: stage.pipelineId,
        pipelineStageId: stage.id,
        subjectBusinessId: business.id,
      },
    });

    if (
      lifecycleStage === BusinessLifecycleStage.TRIAL ||
      lifecycleStage === BusinessLifecycleStage.ACTIVE
    ) {
      await this.applyAccessForLifecycle(business.id, lifecycleStage);
    }

    return business;
  }

  /**
   * Moves a funnel Business to another ops pipeline stage and syncs lifecycleStage.
   */
  async moveLifecycleStage(input: MoveLifecycleStageInput) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: input.businessId,
        deletedAt: null,
        type: BusinessType.TENANT,
      },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (!business.lifecyclePipelineId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Business is not placed on a lifecycle pipeline',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id: input.pipelineStageId,
        pipelineId: business.lifecyclePipelineId,
      },
      include: {
        pipeline: { select: { id: true, businessId: true } },
        business: { select: { type: true } },
      },
    });
    if (!stage || stage.business.type !== BusinessType.INTERNAL) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Pipeline stage not found on ops pipeline',
        HttpStatus.BAD_REQUEST,
      );
    }

    const previousLifecycle = business.lifecycleStage;
    const nextLifecycle =
      stage.mapsToLifecycleStage ?? business.lifecycleStage;

    const updated = await this.prisma.business.update({
      where: { id: business.id },
      data: {
        lifecyclePipelineStageId: stage.id,
        lifecyclePipelineId: stage.pipelineId,
        lifecycleStage: nextLifecycle,
      },
    });

    await this.auditService.log({
      actorUserId: input.actorUserId ?? SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: stage.pipeline.businessId,
      action: 'business.lifecycle_stage_changed',
      entityType: 'Business',
      entityId: business.id,
      metadata: {
        fromStageId: business.lifecyclePipelineStageId,
        toStageId: stage.id,
        fromLifecycle: previousLifecycle,
        toLifecycle: nextLifecycle,
      },
    });

    if (nextLifecycle !== previousLifecycle) {
      await this.applyAccessForLifecycle(business.id, nextLifecycle);
    }

    return updated;
  }

  async listBoardCards(pipelineId: string, opsBusinessId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, businessId: opsBusinessId },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (!pipeline) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Pipeline not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const businesses = await this.prisma.business.findMany({
      where: {
        deletedAt: null,
        type: BusinessType.TENANT,
        lifecyclePipelineId: pipelineId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        stages: pipeline.stages.map((s) => ({
          id: s.id,
          name: s.name,
          position: s.position,
          type: s.type,
          mapsToLifecycleStage: s.mapsToLifecycleStage,
        })),
      },
      items: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        email: b.email,
        phoneNumber: b.phoneNumber,
        firstName: b.firstName,
        lastName: b.lastName,
        lifecycleStage: b.lifecycleStage,
        lifecyclePipelineStageId: b.lifecyclePipelineStageId,
        status: b.status,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    };
  }

  private async applyAccessForLifecycle(
    businessId: string,
    lifecycle: BusinessLifecycleStage,
  ) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId },
      select: { name: true },
    });
    if (!business) return;

    if (lifecycle === BusinessLifecycleStage.TRIAL) {
      await this.prisma.business.update({
        where: { id: businessId },
        data: { status: BusinessStatus.ACTIVE },
      });
      await this.provisioning.provisionAccess(businessId, {
        name: business.name,
        accessMode: 'TRIAL',
      });
      this.logger.log(`Provisioned TRIAL access for business ${businessId}`);
      return;
    }

    if (lifecycle === BusinessLifecycleStage.ACTIVE) {
      await this.prisma.business.update({
        where: { id: businessId },
        data: { status: BusinessStatus.ACTIVE },
      });
      await this.provisioning.provisionAccess(businessId, {
        name: business.name,
        accessMode: 'ACTIVE',
      });
      this.logger.log(`Provisioned ACTIVE access for business ${businessId}`);
    }
  }

  private async requireOpsStage(
    opsBusinessId: string,
    pipelineId: string,
    pipelineStageId: string,
  ) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id: pipelineStageId,
        pipelineId,
        businessId: opsBusinessId,
      },
    });
    if (!stage) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Pipeline stage not found on ops pipeline',
        HttpStatus.BAD_REQUEST,
      );
    }
    return stage;
  }
}
