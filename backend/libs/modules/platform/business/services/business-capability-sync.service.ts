import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessCapabilityAssignmentStatus,
  BusinessCapabilitySource,
  CapabilityStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessCapabilityRepository } from '../repositories/business-capability.repository';

/** Capabilities live in BusinessCapability rows — never on subscription JSON. */
@Injectable()
export class BusinessCapabilitySyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessCapabilityRepository: BusinessCapabilityRepository,
  ) {}

  /**
   * Safe grant only — adds missing PLAN_TIER caps, never removes grandfathered rows.
   * Use when a capability is newly added to a tier catalog.
   */
  async grantMissingFromPlanTier(
    businessId: string,
    planTierId: string,
  ): Promise<{ added: number; updated: number }> {
    const activeCapabilityIds = await this.loadActiveCapabilityIds(planTierId);
    let added = 0;
    let updated = 0;

    for (const capabilityId of activeCapabilityIds) {
      const existing =
        await this.businessCapabilityRepository.findByBusinessAndCapability(
          businessId,
          capabilityId,
        );

      if (!existing) {
        await this.businessCapabilityRepository.upsert({
          businessId,
          capabilityId,
          source: BusinessCapabilitySource.PLAN_TIER,
          status: BusinessCapabilityAssignmentStatus.ACTIVE,
        });
        added += 1;
      } else if (
        existing.source === BusinessCapabilitySource.PLAN_TIER &&
        existing.status !== BusinessCapabilityAssignmentStatus.ACTIVE
      ) {
        await this.businessCapabilityRepository.update(existing.id, {
          status: BusinessCapabilityAssignmentStatus.ACTIVE,
        });
        updated += 1;
      }
    }

    return { added, updated };
  }

  /** Grant newly added capability IDs to all businesses currently on the given tiers. */
  async grantCapabilitiesForTiers(
    capabilityIds: string[],
    tierIds: string[],
  ): Promise<{ grantedBusinessIds: string[] }> {
    if (!capabilityIds.length || !tierIds.length) {
      return { grantedBusinessIds: [] };
    }

    const subscriptions = await this.prisma.businessSubscription.findMany({
      where: {
        planTierId: { in: tierIds },
        business: { deletedAt: null },
      },
      select: { businessId: true },
    });

    const grantedBusinessIds: string[] = [];
    for (const sub of subscriptions) {
      let touched = false;
      for (const capabilityId of capabilityIds) {
        const existing =
          await this.businessCapabilityRepository.findByBusinessAndCapability(
            sub.businessId,
            capabilityId,
          );
        if (!existing) {
          await this.businessCapabilityRepository.upsert({
            businessId: sub.businessId,
            capabilityId,
            source: BusinessCapabilitySource.PLAN_TIER,
            status: BusinessCapabilityAssignmentStatus.ACTIVE,
          });
          touched = true;
        } else if (
          existing.source === BusinessCapabilitySource.PLAN_TIER &&
          existing.status !== BusinessCapabilityAssignmentStatus.ACTIVE
        ) {
          await this.businessCapabilityRepository.update(existing.id, {
            status: BusinessCapabilityAssignmentStatus.ACTIVE,
          });
          touched = true;
        }
      }
      if (touched) grantedBusinessIds.push(sub.businessId);
    }

    return { grantedBusinessIds };
  }

  async syncFromPlanTier(
    businessId: string,
    planTierId: string,
  ): Promise<{ added: number; updated: number; removed: number }> {
    const activeCapabilityIds = await this.loadActiveCapabilityIds(planTierId);

    let added = 0;
    let updated = 0;

    for (const capabilityId of activeCapabilityIds) {
      const existing =
        await this.businessCapabilityRepository.findByBusinessAndCapability(
          businessId,
          capabilityId,
        );

      if (!existing) {
        await this.businessCapabilityRepository.upsert({
          businessId,
          capabilityId,
          source: BusinessCapabilitySource.PLAN_TIER,
          status: BusinessCapabilityAssignmentStatus.ACTIVE,
        });
        added += 1;
      } else if (existing.source === BusinessCapabilitySource.PLAN_TIER) {
        if (existing.status !== BusinessCapabilityAssignmentStatus.ACTIVE) {
          await this.businessCapabilityRepository.update(existing.id, {
            status: BusinessCapabilityAssignmentStatus.ACTIVE,
          });
          updated += 1;
        }
      }
    }

    const removed =
      await this.businessCapabilityRepository.deletePlanTierSourcedNotIn(
        businessId,
        activeCapabilityIds,
      );

    return { added, updated, removed };
  }

  private async loadActiveCapabilityIds(planTierId: string): Promise<string[]> {
    const tier = await this.prisma.planTier.findFirst({
      where: { id: planTierId, deletedAt: null },
      include: {
        capabilities: {
          include: { capability: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!tier) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan tier not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return tier.capabilities
      .filter((row) => row.capability.status === CapabilityStatus.ACTIVE)
      .map((row) => row.capabilityId);
  }
}
