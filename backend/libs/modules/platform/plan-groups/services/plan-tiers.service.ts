import { HttpStatus, Injectable } from '@nestjs/common';
import { PlanTierStatus, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { slugify, withSlugSuffix } from '@app/common/utils/slug.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  AssignTierCapabilitiesDto,
  CreatePlanTierDto,
  PlanTierDto,
  ReorderTierCapabilitiesDto,
  UpdatePlanTierDto,
} from '../dto';
import { toPlanTier } from '../mappers/plan-group.mapper';
import { PlanGroupsRepository } from '../repositories/plan-groups.repository';
import { PlanValidationService } from './plan-validation.service';

@Injectable()
export class PlanTiersService {
  constructor(
    private readonly repository: PlanGroupsRepository,
    private readonly validation: PlanValidationService,
    private readonly auditService: AuditService,
  ) {}

  async list(planGroupId: string): Promise<PlanTierDto[]> {
    await this.requireGroup(planGroupId);
    const tiers = await this.repository.findTiers(planGroupId);
    return tiers.map(toPlanTier);
  }

  async create(
    planGroupId: string,
    dto: CreatePlanTierDto,
    actor: RequestUser,
  ): Promise<PlanTierDto> {
    await this.requireGroup(planGroupId);
    const slug = await this.resolveUniqueTierSlug(
      planGroupId,
      dto.name,
      dto.slug,
    );
    const sortOrder =
      dto.sortOrder ??
      (await this.repository.getNextTierSortOrder(planGroupId));

    this.validation.validateTierFeatures(dto.features);

    const tier = await this.repository.createTier({
      planGroup: { connect: { id: planGroupId } },
      slug,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      status: dto.status ?? PlanTierStatus.DRAFT,
      priceMonthly: dto.priceMonthly,
      priceYearly: dto.priceYearly,
      setupFee: dto.setupFee,
      trialDays: dto.trialDays,
      badge: dto.badge?.trim(),
      highlighted: dto.highlighted ?? false,
      ctaLabel: dto.ctaLabel?.trim(),
      ctaUrl: dto.ctaUrl?.trim(),
      sortOrder,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      ...(dto.designSettings !== undefined
        ? {
            designSettings: this.validation.sanitizeTierDesignSettings(
              dto.designSettings,
            ),
          }
        : {}),
    });

    if (dto.features !== undefined) {
      await this.repository.syncTierFeatures(tier.id, dto.features);
    }

    const refreshed = await this.requireTier(planGroupId, tier.id);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.created',
      entityType: 'PlanTier',
      entityId: tier.id,
      metadata: { planGroupId, slug: tier.slug },
    });

    return toPlanTier(refreshed);
  }

  async update(
    planGroupId: string,
    tierId: string,
    dto: UpdatePlanTierDto,
    actor: RequestUser,
  ): Promise<PlanTierDto> {
    await this.requireTier(planGroupId, tierId);
    this.validation.validateTierFeatures(dto.features);

    if (dto.slug !== undefined) {
      const taken = await this.repository.findTierSlugTaken(
        planGroupId,
        dto.slug,
        tierId,
      );
      this.validation.assertTierSlugAvailable(Boolean(taken));
    }

    const designSettings =
      dto.designSettings !== undefined
        ? this.validation.sanitizeTierDesignSettings(dto.designSettings)
        : undefined;

    await this.repository.updateTier(tierId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() }
        : {}),
      ...(dto.priceMonthly !== undefined
        ? { priceMonthly: dto.priceMonthly }
        : {}),
      ...(dto.priceYearly !== undefined
        ? { priceYearly: dto.priceYearly }
        : {}),
      ...(dto.setupFee !== undefined ? { setupFee: dto.setupFee } : {}),
      ...(dto.trialDays !== undefined ? { trialDays: dto.trialDays } : {}),
      ...(dto.badge !== undefined ? { badge: dto.badge?.trim() } : {}),
      ...(dto.highlighted !== undefined
        ? { highlighted: dto.highlighted }
        : {}),
      ...(dto.ctaLabel !== undefined ? { ctaLabel: dto.ctaLabel?.trim() } : {}),
      ...(dto.ctaUrl !== undefined ? { ctaUrl: dto.ctaUrl?.trim() } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue }
        : {}),
      ...(designSettings !== undefined
        ? { designSettings: designSettings }
        : {}),
    });

    if (dto.features !== undefined) {
      await this.repository.syncTierFeatures(tierId, dto.features);
    }

    const refreshed = await this.requireTier(planGroupId, tierId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.updated',
      entityType: 'PlanTier',
      entityId: tierId,
      metadata: { planGroupId, changes: dto },
    });

    return toPlanTier(refreshed);
  }

  async remove(
    planGroupId: string,
    tierId: string,
    actor: RequestUser,
  ): Promise<void> {
    const tier = await this.requireTier(planGroupId, tierId);
    await this.repository.softDeleteTier(tierId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.deleted',
      entityType: 'PlanTier',
      entityId: tierId,
      metadata: { planGroupId, slug: tier.slug },
    });
  }

  async publish(
    planGroupId: string,
    tierId: string,
    actor: RequestUser,
  ): Promise<PlanTierDto> {
    const tier = await this.requireTier(planGroupId, tierId);
    this.validation.validateTierPublishable(tier);

    const updated = await this.repository.updateTier(tierId, {
      status: PlanTierStatus.PUBLISHED,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.published',
      entityType: 'PlanTier',
      entityId: tierId,
      metadata: { planGroupId, slug: tier.slug },
    });

    return toPlanTier(updated);
  }

  async moveToDraft(
    planGroupId: string,
    tierId: string,
    actor: RequestUser,
  ): Promise<PlanTierDto> {
    const tier = await this.requireTier(planGroupId, tierId);

    if (tier.status !== PlanTierStatus.PUBLISHED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Only published tiers can be moved to draft',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.repository.updateTier(tierId, {
      status: PlanTierStatus.DRAFT,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.moved_to_draft',
      entityType: 'PlanTier',
      entityId: tierId,
      metadata: { planGroupId, slug: tier.slug },
    });

    return toPlanTier(updated);
  }

  async archive(
    planGroupId: string,
    tierId: string,
    actor: RequestUser,
  ): Promise<PlanTierDto> {
    const tier = await this.requireTier(planGroupId, tierId);

    if (tier.status === PlanTierStatus.DRAFT) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Draft tiers should be deleted, not archived',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.repository.updateTier(tierId, {
      status: PlanTierStatus.ARCHIVED,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.archived',
      entityType: 'PlanTier',
      entityId: tierId,
      metadata: { planGroupId, slug: tier.slug },
    });

    return toPlanTier(updated);
  }

  async assignCapabilities(
    planGroupId: string,
    tierId: string,
    dto: AssignTierCapabilitiesDto,
    actor: RequestUser,
  ): Promise<PlanTierDto> {
    const tier = await this.requireTier(planGroupId, tierId);
    const uniqueIds = [...new Set(dto.capabilityIds)];
    this.validation.assertNoDuplicateCapabilities(dto.capabilityIds);

    for (const capabilityId of uniqueIds) {
      const capability = await this.repository.findCapability(capabilityId);
      this.validation.validateCapabilityAssignable(capability);

      const existing = await this.repository.findTierCapability(
        tierId,
        capabilityId,
      );
      if (!existing) {
        const startOrder = tier.capabilities.length;
        await this.repository.assignCapabilities(
          tierId,
          [capabilityId],
          startOrder,
        );
      }
    }

    const refreshed = await this.requireTier(planGroupId, tierId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.capabilities_assigned',
      entityType: 'PlanTier',
      entityId: tierId,
      metadata: { planGroupId, capabilityIds: uniqueIds },
    });

    return toPlanTier(refreshed);
  }

  async removeCapability(
    planGroupId: string,
    tierId: string,
    capabilityId: string,
    actor: RequestUser,
  ): Promise<PlanTierDto> {
    await this.requireTier(planGroupId, tierId);
    const existing = await this.repository.findTierCapability(
      tierId,
      capabilityId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Capability assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.repository.removeTierCapability(tierId, capabilityId);
    const refreshed = await this.requireTier(planGroupId, tierId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.capabilities_removed',
      entityType: 'PlanTier',
      entityId: tierId,
      metadata: { planGroupId, capabilityId },
    });

    return toPlanTier(refreshed);
  }

  async reorderCapabilities(
    planGroupId: string,
    tierId: string,
    dto: ReorderTierCapabilitiesDto,
    actor: RequestUser,
  ): Promise<PlanTierDto> {
    await this.requireTier(planGroupId, tierId);
    await this.repository.reorderTierCapabilities(tierId, dto.capabilityIds);
    const refreshed = await this.requireTier(planGroupId, tierId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.plan_tier.capabilities_reordered',
      entityType: 'PlanTier',
      entityId: tierId,
      metadata: { planGroupId, capabilityIds: dto.capabilityIds },
    });

    return toPlanTier(refreshed);
  }

  private async requireGroup(planGroupId: string) {
    const group = await this.repository.findById(planGroupId);
    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan group not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return group;
  }

  private async requireTier(planGroupId: string, tierId: string) {
    const tier = await this.repository.findTier(planGroupId, tierId);
    if (!tier) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan tier not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return tier;
  }

  private async resolveUniqueTierSlug(
    planGroupId: string,
    name: string,
    requested?: string,
  ): Promise<string> {
    const base = slugify(requested?.trim() || name);
    let candidate = base;
    let suffix = 1;

    while (await this.repository.findTierSlugTaken(planGroupId, candidate)) {
      suffix += 1;
      candidate = withSlugSuffix(base, suffix);
    }

    return candidate;
  }
}
