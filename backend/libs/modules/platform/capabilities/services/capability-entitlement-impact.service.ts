import { Injectable } from '@nestjs/common';
import {
  BusinessCapabilityAssignmentStatus,
  BusinessFeatureGrantSource,
  BusinessFeatureGrantStatus,
  EntitlementChangeCampaignPolicy,
  EntitlementChangeCampaignType,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PrismaService } from '@app/core/database/prisma.service';
import { EntitlementService } from '@app/modules/platform/business/services/entitlement.service';
import { EntitlementChangeDiffService } from '@app/modules/platform/operations/services/entitlement-change-diff.service';
import { OperationsCampaignService } from '@app/modules/platform/operations/services/operations-campaign.service';
import {
  formatEntitlementChangeDetail,
  type EntitlementChangeDiff,
} from '@app/modules/platform/operations/utils/entitlement-change-diff.util';

/**
 * Handles grandfathering + ops campaigns when services are removed from a capability,
 * and entitlement cache invalidation when services are added.
 */
@Injectable()
export class CapabilityEntitlementImpactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementService: EntitlementService,
    private readonly operationsCampaigns: OperationsCampaignService,
    private readonly entitlementDiff: EntitlementChangeDiffService,
  ) {}

  async onFeaturesAdded(capabilityId: string): Promise<void> {
    const businessIds = await this.businessIdsHoldingCapability(capabilityId);
    await Promise.all(
      businessIds.map((id) => this.entitlementService.invalidate(id)),
    );
  }

  async onFeaturesRemoved(
    capabilityId: string,
    featureKeys: string[],
    actor?: RequestUser,
  ): Promise<{ campaignId: string | null; affectedCount: number }> {
    if (!featureKeys.length) {
      return { campaignId: null, affectedCount: 0 };
    }

    const capability = await this.entitlementDiff.resolveCapabilityNamed(
      capabilityId,
    );
    if (!capability) {
      return { campaignId: null, affectedCount: 0 };
    }

    const businessIds = await this.businessIdsHoldingCapability(capabilityId);
    if (!businessIds.length) {
      return { campaignId: null, affectedCount: 0 };
    }

    // Pin removed features for current holders (grandfather).
    for (const businessId of businessIds) {
      for (const featureKey of featureKeys) {
        await this.prisma.businessFeatureGrant.upsert({
          where: {
            businessId_featureKey_source: {
              businessId,
              featureKey,
              source: BusinessFeatureGrantSource.GRANDFATHERED,
            },
          },
          create: {
            businessId,
            featureKey,
            capabilityId,
            source: BusinessFeatureGrantSource.GRANDFATHERED,
            status: BusinessFeatureGrantStatus.ACTIVE,
          },
          update: {
            status: BusinessFeatureGrantStatus.ACTIVE,
            capabilityId,
            revokedAt: null,
          },
        });
      }
      await this.entitlementService.invalidate(businessId);
    }

    // Features are already unassigned — after = remaining active, before = remaining + removed.
    const afterKeys =
      await this.entitlementDiff.listActiveFeatureKeysForCapability(
        capabilityId,
      );
    const beforeKeys = [...new Set([...afterKeys, ...featureKeys])];
    const [removedServices, afterServices, beforeServices] = await Promise.all([
      this.entitlementDiff.resolveServices(featureKeys),
      this.entitlementDiff.resolveServices(afterKeys),
      this.entitlementDiff.resolveServices(beforeKeys),
    ]);

    const diff: EntitlementChangeDiff = {
      services: {
        capability,
        before: beforeServices,
        after: afterServices,
        removed: removedServices,
        added: [],
      },
    };

    const defaultEffective = new Date();
    defaultEffective.setDate(defaultEffective.getDate() + 30);

    const removedNames = removedServices.map((s) => s.name).join(', ');
    const campaign = await this.operationsCampaigns.openOrMergeCampaign({
      type: EntitlementChangeCampaignType.CAPABILITY_FEATURE,
      summary: `Service(s) removed from ${capability.name}${
        removedNames ? `: ${removedNames}` : ''
      }`,
      message: formatEntitlementChangeDetail({
        type: 'CAPABILITY_FEATURE',
        diff,
      }),
      policy: EntitlementChangeCampaignPolicy.KEEP_GRANDFATHERED,
      capabilityId,
      featureKeys,
      businessIds,
      effectiveAt: defaultEffective,
      actor,
      payload: {
        featureKeys,
        capabilityId,
        capability,
        beforeFeatureKeys: beforeKeys,
        afterFeatureKeys: afterKeys,
        diff,
      },
    });

    if (campaign?.id) {
      await this.prisma.businessFeatureGrant.updateMany({
        where: {
          businessId: { in: businessIds },
          featureKey: { in: featureKeys },
          source: BusinessFeatureGrantSource.GRANDFATHERED,
          status: BusinessFeatureGrantStatus.ACTIVE,
        },
        data: { campaignId: campaign.id },
      });
    }

    return {
      campaignId: campaign?.id ?? null,
      affectedCount: businessIds.length,
    };
  }

  private async businessIdsHoldingCapability(
    capabilityId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.businessCapability.findMany({
      where: {
        capabilityId,
        status: BusinessCapabilityAssignmentStatus.ACTIVE,
        business: { deletedAt: null },
      },
      select: { businessId: true },
    });
    return rows.map((r) => r.businessId);
  }
}
