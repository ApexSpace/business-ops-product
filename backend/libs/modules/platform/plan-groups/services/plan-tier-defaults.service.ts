import { HttpStatus, Injectable } from '@nestjs/common';
import { CapabilityStatus, PlanTierStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';

export interface PlanTierDefaultsDto {
  planGroupId: string;
  planTierId: string;
  suggestedSnapshotId?: string | null;
  suggestedSnapshotName?: string | null;
  capabilities: { key: string; name: string }[];
  amount?: string | null;
  currency: string;
  trialDays?: number | null;
}

@Injectable()
export class PlanTierDefaultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTierDefaults(
    groupId: string,
    tierId: string,
  ): Promise<PlanTierDefaultsDto> {
    const tier = await this.prisma.planTier.findFirst({
      where: {
        id: tierId,
        planGroupId: groupId,
        deletedAt: null,
        status: PlanTierStatus.PUBLISHED,
      },
      include: {
        planGroup: {
          include: {
            snapshot: { select: { id: true, name: true } },
          },
        },
        capabilities: {
          include: { capability: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!tier) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Active plan tier not found in the selected group',
        HttpStatus.NOT_FOUND,
      );
    }

    const capabilities = tier.capabilities
      .filter((row) => row.capability.status === CapabilityStatus.ACTIVE)
      .map((row) => ({
        key: row.capability.key,
        name: row.capability.name,
      }));

    return {
      planGroupId: groupId,
      planTierId: tierId,
      suggestedSnapshotId: tier.planGroup.snapshotId,
      suggestedSnapshotName: tier.planGroup.snapshot?.name ?? null,
      capabilities,
      amount: tier.priceMonthly?.toString() ?? null,
      currency: tier.planGroup.currency,
      trialDays: tier.trialDays,
    };
  }

  async getGroupDefaults(groupId: string): Promise<{
    planGroupId: string;
    suggestedSnapshotId?: string | null;
    suggestedSnapshotName?: string | null;
    currency: string;
  }> {
    const group = await this.prisma.planGroup.findFirst({
      where: { id: groupId, deletedAt: null },
      include: { snapshot: { select: { id: true, name: true } } },
    });

    if (!group) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      planGroupId: groupId,
      suggestedSnapshotId: group.snapshotId,
      suggestedSnapshotName: group.snapshot?.name ?? null,
      currency: group.currency,
    };
  }
}
