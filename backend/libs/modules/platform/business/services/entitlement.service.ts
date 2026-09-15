import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BusinessAddonSource,
  BusinessAddonStatus,
  BusinessLocationStatus,
  MembershipStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { RedisService } from '@app/core/redis/redis.service';
import { BusinessEffectiveCapabilitiesService } from '@app/modules/platform/business/services/business-effective-capabilities.service';
import { BusinessAccessResolverService } from '@app/modules/platform/business/services/business-access-resolver.service';

export type EntitlementSnapshot = {
  businessId: string;
  features: string[];
  staffLimit: number | null;
  locationLimit: number | null;
  staffUsed: number;
  locationUsed: number;
  canAccessWorkspace: boolean;
  isReadOnly: boolean;
  restrictionReason: string | null;
  tierId: string | null;
  tierName: string | null;
  addons: Array<{
    id: string;
    key: string;
    name: string;
    source: BusinessAddonSource;
    status: BusinessAddonStatus;
  }>;
};

const CACHE_TTL_SECONDS = 300;

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly effectiveCapabilities: BusinessEffectiveCapabilitiesService,
    private readonly accessResolver: BusinessAccessResolverService,
  ) {}

  private cacheKey(businessId: string) {
    return `entitlement:${businessId}`;
  }

  async invalidate(businessId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (client) {
        await client.del(this.cacheKey(businessId));
      }
    } catch (err) {
      this.logger.warn(
        `Failed to invalidate entitlement cache for ${businessId}: ${err}`,
      );
    }
  }

  async resolve(businessId: string): Promise<EntitlementSnapshot> {
    try {
      const client = this.redis.getClient();
      const cached = client
        ? await client.get(this.cacheKey(businessId))
        : null;
      if (cached) {
        return JSON.parse(cached) as EntitlementSnapshot;
      }
    } catch {
      // cache miss / redis down — compute fresh
    }

    const snapshot = await this.compute(businessId);

    try {
      const client = this.redis.getClient();
      if (client) {
        await client.set(
          this.cacheKey(businessId),
          JSON.stringify(snapshot),
          'EX',
          CACHE_TTL_SECONDS,
        );
      }
    } catch {
      // non-fatal
    }

    return snapshot;
  }

  private async compute(businessId: string): Promise<EntitlementSnapshot> {
    const [
      business,
      subscription,
      featureKeys,
      addons,
      staffUsed,
      locationUsed,
    ] = await Promise.all([
      this.prisma.business.findFirst({
        where: { id: businessId, deletedAt: null },
        select: {
          id: true,
          status: true,
          snapshotId: true,
          snapshotAppliedAt: true,
        },
      }),
      this.prisma.businessSubscription.findUnique({
        where: { businessId },
        include: {
          planTier: { select: { id: true, name: true } },
          tierVersion: true,
        },
      }),
      this.effectiveCapabilities.resolveFeatureKeys(businessId),
      this.prisma.businessAddon.findMany({
        where: {
          businessId,
          status: BusinessAddonStatus.ACTIVE,
        },
        include: {
          addon: {
            select: {
              id: true,
              key: true,
              name: true,
              staffLimitDelta: true,
              locationLimitDelta: true,
            },
          },
        },
      }),
      this.prisma.businessMembership.count({
        where: {
          businessId,
          status: MembershipStatus.ACTIVE,
          deletedAt: null,
          isServiceProvider: true,
        },
      }),
      this.prisma.businessLocation.count({
        where: {
          businessId,
          status: BusinessLocationStatus.ACTIVE,
        },
      }),
    ]);

    const capabilities =
      await this.effectiveCapabilities.resolveEffectiveCapabilities(businessId);

    const access = business
      ? this.accessResolver.resolve({
          businessId,
          businessStatus: business.status,
          snapshotId: business.snapshotId,
          snapshotAppliedAt: business.snapshotAppliedAt,
          subscription: subscription
            ? {
                status: subscription.status,
                planTierId: subscription.planTierId,
                paymentStatus: subscription.paymentStatus,
                currentPeriodEnd: subscription.currentPeriodEnd,
              }
            : null,
          capabilities,
        })
      : null;

    let staffLimit =
      subscription?.staffLimitAtPurchase ??
      subscription?.tierVersion?.staffLimit ??
      null;
    let locationLimit =
      subscription?.locationLimitAtPurchase ??
      subscription?.tierVersion?.locationLimit ??
      null;

    for (const row of addons) {
      if (row.addon.staffLimitDelta != null && staffLimit != null) {
        staffLimit += row.addon.staffLimitDelta;
      }
      if (row.addon.locationLimitDelta != null && locationLimit != null) {
        locationLimit += row.addon.locationLimitDelta;
      }
    }

    return {
      businessId,
      features: [...featureKeys],
      staffLimit,
      locationLimit,
      staffUsed,
      locationUsed,
      canAccessWorkspace: access?.canAccessWorkspace ?? false,
      isReadOnly: false,
      restrictionReason: access?.canAccessWorkspace
        ? null
        : (access?.reasonCode ?? 'ACCESS_DENIED'),
      tierId: subscription?.planTierId ?? null,
      tierName: subscription?.planTier?.name ?? null,
      addons: addons.map((a) => ({
        id: a.addon.id,
        key: a.addon.key,
        name: a.addon.name,
        source: a.source,
        status: a.status,
      })),
    };
  }

  async assertStaffLimit(businessId: string): Promise<void> {
    const ent = await this.resolve(businessId);
    if (ent.staffLimit != null && ent.staffUsed >= ent.staffLimit) {
      throw new AppException(
        ErrorCode.TIER_LIMIT_EXCEEDED,
        `Staff limit reached (${ent.staffUsed}/${ent.staffLimit}). Upgrade your tier to add more staff.`,
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async assertLocationLimit(businessId: string): Promise<void> {
    const ent = await this.resolve(businessId);
    if (ent.locationLimit != null && ent.locationUsed >= ent.locationLimit) {
      throw new AppException(
        ErrorCode.LOCATION_LIMIT_EXCEEDED,
        `Location limit reached (${ent.locationUsed}/${ent.locationLimit}). Upgrade your tier to add more locations.`,
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
