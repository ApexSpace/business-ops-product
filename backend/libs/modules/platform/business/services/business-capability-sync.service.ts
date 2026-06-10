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

  async syncFromPlanTier(
    businessId: string,
    planTierId: string,
  ): Promise<{ added: number; updated: number; removed: number }> {
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

    const activeCapabilityIds = tier.capabilities
      .filter((row) => row.capability.status === CapabilityStatus.ACTIVE)
      .map((row) => row.capabilityId);

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
}
