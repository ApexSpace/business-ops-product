import { HttpStatus, Injectable } from '@nestjs/common';
import { PlanGroupStatus, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreatePlanGroupDto,
  PlanGroupDetailDto,
  PlanGroupListItemDto,
  PlanGroupStatsDto,
  PublicPricingDto,
  UpdatePlanGroupDto,
} from '../dto';
import {
  toPlanGroupDetail,
  toPlanGroupListItem,
} from '../mappers/plan-group.mapper';
import { PlanGroupsRepository } from '../repositories/plan-groups.repository';
import { PlanEmbedService } from './plan-embed.service';
import { PlanValidationService } from './plan-validation.service';
import { SnapshotRepository } from '@app/modules/platform/snapshots/repositories/snapshot.repository';

@Injectable()
export class PlanGroupsService {
  constructor(
    private readonly repository: PlanGroupsRepository,
    private readonly validation: PlanValidationService,
    private readonly embedService: PlanEmbedService,
    private readonly auditService: AuditService,
    private readonly snapshotRepository: SnapshotRepository,
  ) {}

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    status?: PlanGroupStatus;
    search?: string;
  }): Promise<{
    items: PlanGroupListItemDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { items, total } = await this.repository.findMany(
      params.skip,
      params.limit,
      {
        status: params.status,
        search: params.search?.trim() || undefined,
      },
    );
    return {
      items: items.map(toPlanGroupListItem),
      meta: { total, page: params.page, limit: params.limit },
    };
  }

  async getStats(): Promise<PlanGroupStatsDto> {
    return this.repository.getStats();
  }

  async get(id: string): Promise<PlanGroupDetailDto> {
    const group = await this.requireGroup(id);
    const tiers = await this.repository.findTiers(id);
    return toPlanGroupDetail(group, tiers);
  }

  async create(
    dto: CreatePlanGroupDto,
    actor: RequestUser,
  ): Promise<PlanGroupDetailDto> {
    const status = dto.status ?? PlanGroupStatus.DRAFT;
    const snapshotConnect = await this.resolveSnapshotConnect(dto.snapshotId);

    const group = await this.repository.create({
      name: dto.name.trim(),
      description: dto.description?.trim(),
      currency: dto.currency?.trim() || 'USD',
      status,
      billingCycles: dto.billingCycles ?? ['MONTHLY', 'YEARLY'],
      defaultCtaLabel: dto.defaultCtaLabel?.trim(),
      defaultCtaUrl: dto.defaultCtaUrl?.trim(),
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      ...(snapshotConnect !== undefined ? { snapshot: snapshotConnect } : {}),
      embedSettings: { create: {} },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_group.created',
      entityType: 'PlanGroup',
      entityId: group.id,
      metadata: { name: group.name },
    });

    return toPlanGroupDetail(group);
  }

  async update(
    id: string,
    dto: UpdatePlanGroupDto,
    actor: RequestUser,
  ): Promise<PlanGroupDetailDto> {
    await this.requireGroup(id);

    const designSettings =
      dto.designSettings !== undefined
        ? this.validation.sanitizeGroupDesignSettings(dto.designSettings)
        : undefined;

    const snapshotConnect =
      dto.snapshotId !== undefined
        ? await this.resolveSnapshotConnect(dto.snapshotId)
        : undefined;

    const updated = await this.repository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() || null }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency.trim() } : {}),
      ...(dto.billingCycles !== undefined
        ? { billingCycles: dto.billingCycles }
        : {}),
      ...(dto.defaultCtaLabel !== undefined
        ? { defaultCtaLabel: dto.defaultCtaLabel?.trim() }
        : {}),
      ...(dto.defaultCtaUrl !== undefined
        ? { defaultCtaUrl: dto.defaultCtaUrl?.trim() }
        : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue }
        : {}),
      ...(designSettings !== undefined
        ? { designSettings: designSettings }
        : {}),
      ...(snapshotConnect !== undefined ? { snapshot: snapshotConnect } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_group.updated',
      entityType: 'PlanGroup',
      entityId: id,
      metadata: { changes: dto },
    });

    return toPlanGroupDetail(updated);
  }

  async remove(id: string, actor: RequestUser): Promise<void> {
    const group = await this.requireGroup(id);
    await this.repository.delete(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_group.deleted',
      entityType: 'PlanGroup',
      entityId: id,
      metadata: { name: group.name },
    });
  }

  async publish(id: string, actor: RequestUser): Promise<PlanGroupDetailDto> {
    const group = await this.requireGroup(id);
    const tiers = await this.repository.findTiersForPublishValidation(id);
    this.validation.validateGroupPublishable(group, tiers);

    const updated = await this.repository.update(id, {
      status: PlanGroupStatus.PUBLISHED,
      publishedAt: new Date(),
    });
    await this.repository.publishAllTiersForGroup(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_group.published',
      entityType: 'PlanGroup',
      entityId: id,
      metadata: { name: group.name },
    });

    return toPlanGroupDetail(updated);
  }

  async moveToDraft(
    id: string,
    actor: RequestUser,
  ): Promise<PlanGroupDetailDto> {
    const group = await this.requireGroup(id);

    if (group.status !== PlanGroupStatus.PUBLISHED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Only published plan groups can be moved to draft',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.repository.update(id, {
      status: PlanGroupStatus.DRAFT,
      publishedAt: null,
    });
    await this.repository.moveAllTiersToDraftForGroup(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_group.moved_to_draft',
      entityType: 'PlanGroup',
      entityId: id,
      metadata: { name: group.name },
    });

    return toPlanGroupDetail(updated);
  }

  async archive(id: string, actor: RequestUser): Promise<PlanGroupDetailDto> {
    const group = await this.requireGroup(id);

    if (group.status === PlanGroupStatus.DRAFT) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Draft plan groups should be deleted, not archived',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.repository.update(id, {
      status: PlanGroupStatus.ARCHIVED,
    });
    await this.repository.archiveAllPublishedTiersForGroup(id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_group.archived',
      entityType: 'PlanGroup',
      entityId: id,
      metadata: { name: group.name },
    });

    return toPlanGroupDetail(updated);
  }

  async getPreview(id: string): Promise<PublicPricingDto> {
    await this.requireGroup(id);
    return this.embedService.buildPublicPricing(id, { preview: true });
  }

  private async requireGroup(id: string) {
    const group = await this.repository.findById(id);
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan group not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return group;
  }

  private async resolveSnapshotConnect(snapshotId?: string | null) {
    if (snapshotId === undefined) {
      return undefined;
    }

    const trimmed = snapshotId?.trim();
    if (!trimmed) {
      return { disconnect: true };
    }

    const snapshot = await this.snapshotRepository.findPublishedById(trimmed);
    if (!snapshot) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid or unpublished snapshot',
        HttpStatus.BAD_REQUEST,
      );
    }

    return { connect: { id: snapshot.id } };
  }
}
