import { forwardRef, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  AddonPurchaseMode,
  AddonStatus,
  BusinessAddonSource,
  BusinessAddonStatus,
  BusinessMemberRole,
  CapabilityStatus,
  EntitlementChangeCampaignPolicy,
  EntitlementChangeCampaignType,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import { formatUserName } from '@app/modules/communications/email/utils/email-variables.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessAddonSyncService } from '@app/modules/platform/business/services/business-addon-sync.service';
import { OperationsCampaignService } from '@app/modules/platform/operations/services/operations-campaign.service';
import { EntitlementChangeDiffService } from '@app/modules/platform/operations/services/entitlement-change-diff.service';
import { StripePlatformTierPriceSyncService } from '@app/modules/platform/billing/stripe/services/stripe-platform-tier-price-sync.service';
import {
  formatEntitlementChangeDetail,
  type EntitlementChangeDiff,
} from '@app/modules/platform/operations/utils/entitlement-change-diff.util';
import {
  AddonImpactPreviewDto,
  AddonSubscriberPolicy,
  CreateAddonDto,
  ListAddonsQueryDto,
  MigrateAddonSubscribersDto,
  UpdateAddonDto,
} from '../dto/addon.dto';

const addonInclude = {
  capability: { select: { id: true, key: true, name: true, status: true } },
  tierLinks: {
    include: {
      tier: { select: { id: true, key: true, name: true, status: true } },
    },
  },
  includedInTiers: {
    include: {
      tier: { select: { id: true, key: true, name: true, status: true } },
    },
  },
} satisfies Prisma.AddonInclude;

type AddonDetail = Prisma.AddonGetPayload<{ include: typeof addonInclude }>;

@Injectable()
export class AddonsService {
  private readonly logger = new Logger(AddonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => BusinessAddonSyncService))
    private readonly addonSync: BusinessAddonSyncService,
    private readonly emailNotificationService: EmailNotificationService,
    @Inject(forwardRef(() => OperationsCampaignService))
    private readonly operationsCampaigns: OperationsCampaignService,
    private readonly entitlementDiff: EntitlementChangeDiffService,
    private readonly stripeTierPriceSync: StripePlatformTierPriceSyncService,
  ) {}

  async list(query: ListAddonsQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Prisma.AddonWhereInput = {
      deletedAt: null,
      ...(query.purchaseMode ? { purchaseMode: query.purchaseMode } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { key: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.addon.findMany({
        where,
        include: addonInclude,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.addon.count({ where }),
    ]);

    return {
      items: items.map((a) => this.toDto(a)),
      meta: { total, page, limit },
    };
  }

  async getById(id: string) {
    return this.toDto(await this.requireAddon(id));
  }

  async create(dto: CreateAddonDto, actor: RequestUser) {
    this.validateModeFields(dto.purchaseMode, dto);

    const key = await this.resolveUniqueKey(dto.key, dto.name);

    await this.assertCapability(dto.capabilityId);
    if (dto.tierIds?.length) {
      await this.assertTiersExist(dto.tierIds);
    }
    if (dto.includeInTierIds?.length) {
      await this.assertTiersExist(dto.includeInTierIds);
    }

    const addon = await this.prisma.$transaction(async (tx) => {
      const created = await tx.addon.create({
        data: {
          key,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          purchaseMode: dto.purchaseMode,
          status: dto.status ?? AddonStatus.DRAFT,
          isPublic: dto.isPublic ?? true,
          priceMonthly:
            dto.purchaseMode === AddonPurchaseMode.INDEPENDENT
              ? dto.priceMonthly!
              : null,
          priceYearly:
            dto.purchaseMode === AddonPurchaseMode.INDEPENDENT
              ? dto.priceYearly ?? null
              : null,
          staffLimitDelta: dto.staffLimitDelta,
          locationLimitDelta: dto.locationLimitDelta,
          capabilityId: dto.capabilityId,
          sortOrder: dto.sortOrder ?? 0,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      if (dto.purchaseMode === AddonPurchaseMode.DEPENDENT && dto.tierIds) {
        await tx.addonTierLink.createMany({
          data: dto.tierIds.map((tierId) => ({
            addonId: created.id,
            tierId,
          })),
        });
      }

      if (
        dto.purchaseMode === AddonPurchaseMode.INDEPENDENT &&
        dto.includeInTierIds?.length
      ) {
        await tx.tierIncludedAddon.createMany({
          data: dto.includeInTierIds.map((tierId, i) => ({
            tierId,
            addonId: created.id,
            sortOrder: i,
          })),
        });
      }

      return created;
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.addon.created',
      entityType: 'Addon',
      entityId: addon.id,
      metadata: { key: addon.key, purchaseMode: addon.purchaseMode },
    });

    const catalogTier =
      dto.purchaseMode === AddonPurchaseMode.DEPENDENT
        ? (dto.tierIds ?? [])
        : (dto.includeInTierIds ?? []);
    if (catalogTier.length > 0) {
      await this.addonSync.grantIncludedAddonForTiers(addon.id, catalogTier);
    }

    let stripeSync = undefined;
    if (dto.purchaseMode === AddonPurchaseMode.INDEPENDENT) {
      stripeSync = await this.safeSyncAddonStripePrices(addon.id);
    }

    const result = await this.getById(addon.id);
    return { ...result, stripeSync };
  }

  private async resolveUniqueKey(
    rawKey: string | undefined,
    name: string,
  ): Promise<string> {
    const base = (rawKey?.trim() || this.slugify(name) || 'addon').slice(0, 70);
    let candidate = base;
    let i = 2;
    while (
      await this.prisma.addon.findFirst({
        where: { key: candidate, deletedAt: null },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${i}`.slice(0, 80);
      i += 1;
    }
    return candidate;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async update(id: string, dto: UpdateAddonDto, actor: RequestUser) {
    const existing = await this.requireAddon(id);
    const nextMode = dto.purchaseMode ?? existing.purchaseMode;

    if (dto.purchaseMode && dto.purchaseMode !== existing.purchaseMode) {
      await this.handleModeFlip(existing, dto);
    }

    this.validateModeFields(nextMode, {
      purchaseMode: nextMode,
      priceMonthly:
        dto.priceMonthly !== undefined
          ? dto.priceMonthly ?? undefined
          : existing.priceMonthly?.toNumber(),
      tierIds:
        dto.tierIds ??
        existing.tierLinks.map((l) => l.tierId),
    });

    if (dto.capabilityId) {
      await this.assertCapability(dto.capabilityId);
    }
    if (dto.tierIds) {
      await this.assertTiersExist(dto.tierIds);
    }
    if (dto.includeInTierIds) {
      await this.assertTiersExist(dto.includeInTierIds);
    }

    const impact = await this.buildImpactPreview(existing, dto);
    if (
      impact.affectedCount > 0 &&
      dto.subscriberPolicy === 'convert_to_purchased' &&
      !impact.convertAvailable
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Convert to paid requires Independent mode with a monthly price',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.addon.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() }
            : {}),
          ...(dto.purchaseMode !== undefined
            ? { purchaseMode: dto.purchaseMode }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
          ...(dto.priceMonthly !== undefined
            ? { priceMonthly: dto.priceMonthly }
            : {}),
          ...(dto.priceYearly !== undefined
            ? { priceYearly: dto.priceYearly }
            : {}),
          ...(dto.staffLimitDelta !== undefined
            ? { staffLimitDelta: dto.staffLimitDelta }
            : {}),
          ...(dto.locationLimitDelta !== undefined
            ? { locationLimitDelta: dto.locationLimitDelta }
            : {}),
          ...(dto.capabilityId !== undefined
            ? { capabilityId: dto.capabilityId }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.metadata !== undefined
            ? { metadata: dto.metadata as Prisma.InputJsonValue }
            : {}),
          ...(nextMode === AddonPurchaseMode.DEPENDENT
            ? { priceMonthly: null, priceYearly: null }
            : {}),
        },
      });

      if (nextMode === AddonPurchaseMode.DEPENDENT && dto.tierIds) {
        if (dto.tierIds.length === 0) {
          throw new AppException(
            ErrorCode.ADDON_TIER_LINK_REQUIRED,
            'Dependent add-on must be linked to at least one tier',
            HttpStatus.BAD_REQUEST,
          );
        }
        await tx.addonTierLink.deleteMany({ where: { addonId: id } });
        await tx.addonTierLink.createMany({
          data: dto.tierIds.map((tierId) => ({ addonId: id, tierId })),
        });
        await tx.tierIncludedAddon.deleteMany({ where: { addonId: id } });
      }

      if (nextMode === AddonPurchaseMode.INDEPENDENT) {
        // Dependent links are never valid on an independent add-on
        // (covers DEPENDENT → INDEPENDENT flips even when tierIds omitted).
        await tx.addonTierLink.deleteMany({ where: { addonId: id } });

        if (dto.includeInTierIds) {
          await tx.tierIncludedAddon.deleteMany({ where: { addonId: id } });
          if (dto.includeInTierIds.length) {
            await tx.tierIncludedAddon.createMany({
              data: dto.includeInTierIds.map((tierId, i) => ({
                tierId,
                addonId: id,
                sortOrder: i,
              })),
            });
          }
        }
      }
    });

    const policy = dto.subscriberPolicy ?? 'keep_grandfathered';
    if (impact.affectedCount > 0) {
      await this.applySubscriberPolicy({
        addonId: id,
        addonName: dto.name?.trim() || existing.name,
        policy,
        businessIds: impact.businesses.map((b) => b.businessId),
        notifyOwners: dto.notifyOwners === true,
        notifyEffectiveDate: dto.notifyEffectiveDate,
        notifyMessage: dto.notifyMessage,
        actor,
      });
    }

    // Plan A / D12: newly linked tiers auto-grant to existing businesses (goodwill).
    // Does not revoke grandfathered includes on other removed add-ons.
    const beforeCatalog = this.resolveCatalogTierIds(existing);
    const updated = await this.requireAddon(id);
    const afterCatalog = this.resolveCatalogTierIds(updated);
    const addedTier = [...afterCatalog].filter(
      (tierId) => !beforeCatalog.has(tierId),
    );
    if (addedTier.length > 0) {
      const grant = await this.addonSync.grantIncludedAddonForTiers(
        id,
        addedTier,
      );
      await this.auditService.log({
        actorUserId: actor.id,
        action: 'platform.addon.auto_granted',
        entityType: 'Addon',
        entityId: id,
        metadata: {
          addedTier,
          grantedBusinessCount: grant.grantedBusinessIds.length,
          grantedBusinessIds: grant.grantedBusinessIds,
        },
      });
    }

    // Capability pack changed on an already-included add-on → re-sync holders.
    const capabilityChanged =
      dto.capabilityId !== undefined &&
      dto.capabilityId !== existing.capabilityId;
    if (capabilityChanged) {
      const resync = await this.addonSync.resyncHoldersForAddon(id);
      await this.auditService.log({
        actorUserId: actor.id,
        action: 'platform.addon.capability_resynced',
        entityType: 'Addon',
        entityId: id,
        metadata: {
          previousCapabilityId: existing.capabilityId,
          capabilityId: dto.capabilityId,
          businessCount: resync.businessIds.length,
          businessIds: resync.businessIds,
        },
      });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.addon.updated',
      entityType: 'Addon',
      entityId: id,
      metadata: {
        purchaseMode: nextMode,
        modeFlip: dto.purchaseMode !== undefined,
        subscriberPolicy: policy,
        affectedSubscribers: impact.affectedCount,
        notifiedOwners: dto.notifyOwners === true,
        autoGrantedTiers: addedTier,
      },
    });

    const priceTouched =
      dto.priceMonthly !== undefined ||
      dto.priceYearly !== undefined ||
      dto.status === AddonStatus.PUBLISHED;
    let stripeSync = undefined;
    if (nextMode === AddonPurchaseMode.INDEPENDENT && priceTouched) {
      stripeSync = await this.safeSyncAddonStripePrices(id);
    }

    const result = await this.getById(id);
    return { ...result, stripeSync };
  }

  async syncStripePrices(id: string, actor: RequestUser) {
    await this.requireAddon(id);
    const stripeSync =
      await this.stripeTierPriceSync.syncAddonCatalogPrices(id);
    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.addon.stripe_prices_synced',
      entityType: 'Addon',
      entityId: id,
      metadata: stripeSync as unknown as Record<string, unknown>,
    });
    const result = await this.getById(id);
    return { ...result, stripeSync };
  }

  private async safeSyncAddonStripePrices(addonId: string) {
    const addon = await this.prisma.addon.findFirst({
      where: { id: addonId, deletedAt: null },
      select: { status: true, purchaseMode: true },
    });
    try {
      return await this.stripeTierPriceSync.syncAddonCatalogPrices(addonId);
    } catch (error) {
      // Published independent add-ons fail closed when Stripe Price create fails.
      if (
        addon?.status === AddonStatus.PUBLISHED &&
        addon.purchaseMode === AddonPurchaseMode.INDEPENDENT
      ) {
        throw error instanceof AppException
          ? error
          : new AppException(
              ErrorCode.STRIPE_PRICE_SYNC_FAILED,
              `Failed to create Stripe Prices for published add-on: ${
                error instanceof Error ? error.message : String(error)
              }`,
              HttpStatus.BAD_GATEWAY,
            );
      }
      if (error instanceof AppException) throw error;
      this.logger.warn(
        `Addon Stripe price sync failed for ${addonId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return undefined;
    }
  }

  async previewImpact(id: string, dto: AddonImpactPreviewDto) {
    const existing = await this.requireAddon(id);
    return this.buildImpactPreview(existing, dto);
  }

  async listSubscribers(id: string) {
    const existing = await this.requireAddon(id);
    const catalogTierIds = this.resolveCatalogTierIds(existing);

    const rows = await this.prisma.businessAddon.findMany({
      where: {
        addonId: id,
        status: BusinessAddonStatus.ACTIVE,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            subscription: { select: { planTierId: true, planTier: { select: { name: true } } } },
          },
        },
      },
      orderBy: { activatedAt: 'desc' },
      take: 200,
    });

    const items = rows.map((row) => {
      const tierId = row.business.subscription?.planTierId ?? null;
      const stillInCatalog = tierId ? catalogTierIds.has(tierId) : false;
      const grandfathered =
        row.source === BusinessAddonSource.INCLUDED && !stillInCatalog;
      return {
        businessId: row.business.id,
        businessName: row.business.name,
        source: row.source,
        status: row.status,
        tierId,
        tierName: row.business.subscription?.planTier?.name ?? null,
        grandfathered,
        priceAtPurchase: row.priceAtPurchase?.toString() ?? null,
        activatedAt: row.activatedAt.toISOString(),
      };
    });

    return {
      addonId: id,
      addonName: existing.name,
      catalogTierIds: [...catalogTierIds],
      totals: {
        included: items.filter((i) => i.source === 'INCLUDED').length,
        purchased: items.filter((i) => i.source === 'PURCHASED').length,
        grandfathered: items.filter((i) => i.grandfathered).length,
      },
      items,
    };
  }

  /** Add-ons for one business (Access tab). */
  async listForBusiness(businessId: string) {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      select: {
        planTierId: true,
        planTier: { select: { id: true, name: true } },
      },
    });

    const rows = await this.prisma.businessAddon.findMany({
      where: {
        businessId,
        status: BusinessAddonStatus.ACTIVE,
      },
      include: {
        addon: {
          include: {
            capability: {
              select: { id: true, key: true, name: true, status: true },
            },
            tierLinks: { select: { tierId: true } },
            includedInTiers: { select: { tierId: true } },
          },
        },
      },
      orderBy: { activatedAt: 'desc' },
    });

    const tierId = subscription?.planTierId ?? null;

    return {
      businessId,
      tierId,
      tierName: subscription?.planTier?.name ?? null,
      items: rows.map((row) => {
        const catalogTier = new Set([
          ...row.addon.tierLinks.map((l) => l.tierId),
          ...row.addon.includedInTiers.map((l) => l.tierId),
        ]);
        const stillInCatalog = tierId ? catalogTier.has(tierId) : false;
        const grandfathered =
          row.source === BusinessAddonSource.INCLUDED && !stillInCatalog;
        return {
          addonId: row.addon.id,
          addonKey: row.addon.key,
          addonName: row.addon.name,
          purchaseMode: row.addon.purchaseMode,
          source: row.source,
          status: row.status,
          grandfathered,
          priceAtPurchase: row.priceAtPurchase?.toString() ?? null,
          capability: row.addon.capability,
          activatedAt: row.activatedAt.toISOString(),
        };
      }),
    };
  }

  async migrateSubscribers(
    id: string,
    dto: MigrateAddonSubscribersDto,
    actor: RequestUser,
  ) {
    const existing = await this.requireAddon(id);
    const subscribers = await this.listSubscribers(id);
    const targets = subscribers.items.filter((item) => {
      if (dto.businessIds?.length) {
        return dto.businessIds.includes(item.businessId);
      }
      return item.grandfathered;
    });

    if (targets.length === 0) {
      return {
        addonId: id,
        policy: dto.policy,
        affectedCount: 0,
        notifiedCount: 0,
      };
    }

    if (
      dto.policy === 'convert_to_purchased' &&
      existing.purchaseMode !== AddonPurchaseMode.INDEPENDENT
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Convert to paid requires the add-on to be Independent with a price',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.applySubscriberPolicy({
      addonId: id,
      addonName: existing.name,
      policy: dto.policy,
      businessIds: targets.map((t) => t.businessId),
      notifyOwners: dto.notifyOwners === true,
      notifyEffectiveDate: dto.notifyEffectiveDate,
      notifyMessage: dto.notifyMessage,
      actor,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.addon.subscribers_migrated',
      entityType: 'Addon',
      entityId: id,
      metadata: {
        policy: dto.policy,
        affectedCount: targets.length,
        notifyOwners: dto.notifyOwners === true,
        businessIds: targets.map((t) => t.businessId),
      },
    });

    return {
      addonId: id,
      policy: dto.policy,
      affectedCount: targets.length,
      notifiedCount: result.notifiedCount,
    };
  }

  private async buildImpactPreview(
    existing: AddonDetail,
    dto: Pick<
      UpdateAddonDto,
      'purchaseMode' | 'tierIds' | 'includeInTierIds' | 'priceMonthly'
    >,
  ) {
    const nextMode = dto.purchaseMode ?? existing.purchaseMode;
    const nextCatalogTierIds = this.resolveProposedCatalogTierIds(
      existing,
      nextMode,
      dto,
    );
    const currentCatalogTierIds = this.resolveCatalogTierIds(existing);

    const rows = await this.prisma.businessAddon.findMany({
      where: {
        addonId: existing.id,
        status: BusinessAddonStatus.ACTIVE,
        source: BusinessAddonSource.INCLUDED,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            subscription: {
              select: {
                planTierId: true,
                planTier: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const businesses = rows
      .map((row) => {
        const tierId = row.business.subscription?.planTierId ?? null;
        const currentlyCovered = tierId
          ? currentCatalogTierIds.has(tierId)
          : false;
        const stillCovered = tierId ? nextCatalogTierIds.has(tierId) : false;
        return {
          businessId: row.business.id,
          businessName: row.business.name,
          tierId,
          tierName: row.business.subscription?.planTier?.name ?? null,
          currentlyCovered,
          stillCovered,
        };
      })
      .filter((b) => !b.stillCovered);

    const removedTier = [...currentCatalogTierIds].filter(
      (tierId) => !nextCatalogTierIds.has(tierId),
    );
    const addedTier = [...nextCatalogTierIds].filter(
      (tierId) => !currentCatalogTierIds.has(tierId),
    );

    return {
      addonId: existing.id,
      addonName: existing.name,
      purchaseMode: nextMode,
      catalogChanged:
        removedTier.length > 0 ||
        addedTier.length > 0 ||
        (dto.purchaseMode != null && dto.purchaseMode !== existing.purchaseMode),
      removedTierIds: removedTier,
      addedTierIds: addedTier,
      affectedCount: businesses.length,
      businesses: businesses.slice(0, 50),
      policies: {
        keep_grandfathered:
          'Leave current businesses with this feature until they change tier or you migrate them later.',
        force_remove:
          'Revoke this included add-on from affected businesses immediately.',
        convert_to_purchased:
          'Keep the feature, but treat it as a paid independent add-on going forward.',
      },
      convertAvailable:
        nextMode === AddonPurchaseMode.INDEPENDENT &&
        (dto.priceMonthly != null || existing.priceMonthly != null),
    };
  }

  private resolveCatalogTierIds(addon: AddonDetail): Set<string> {
    if (addon.purchaseMode === AddonPurchaseMode.DEPENDENT) {
      return new Set(addon.tierLinks.map((l) => l.tier.id));
    }
    return new Set(addon.includedInTiers.map((l) => l.tier.id));
  }

  private resolveProposedCatalogTierIds(
    existing: AddonDetail,
    nextMode: AddonPurchaseMode,
    dto: Pick<UpdateAddonDto, 'tierIds' | 'includeInTierIds'>,
  ): Set<string> {
    if (nextMode === AddonPurchaseMode.DEPENDENT) {
      if (dto.tierIds) return new Set(dto.tierIds);
      return new Set(existing.tierLinks.map((l) => l.tier.id));
    }
    if (dto.includeInTierIds) return new Set(dto.includeInTierIds);
    if (existing.purchaseMode === AddonPurchaseMode.INDEPENDENT) {
      return new Set(existing.includedInTiers.map((l) => l.tier.id));
    }
    // Flipping DEPENDENT → INDEPENDENT with no include list → no catalog includes
    return new Set();
  }

  private async applySubscriberPolicy(input: {
    addonId: string;
    addonName: string;
    policy: AddonSubscriberPolicy;
    businessIds: string[];
    notifyOwners: boolean;
    notifyEffectiveDate?: string;
    notifyMessage?: string;
    actor: RequestUser;
  }): Promise<{ notifiedCount: number }> {
    const addon = await this.requireAddon(input.addonId);

    if (input.policy === 'convert_to_purchased') {
      if (addon.purchaseMode !== AddonPurchaseMode.INDEPENDENT) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Convert to paid requires an Independent add-on with a monthly price',
          HttpStatus.BAD_REQUEST,
        );
      }
      const price = addon.priceMonthly?.toNumber();
      if (price == null) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'Convert to paid requires a monthly price on the add-on',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.prisma.businessAddon.updateMany({
        where: {
          addonId: input.addonId,
          businessId: { in: input.businessIds },
          status: BusinessAddonStatus.ACTIVE,
          source: BusinessAddonSource.INCLUDED,
        },
        data: {
          source: BusinessAddonSource.PURCHASED,
          priceAtPurchase: price,
        },
      });
    }

    if (input.policy === 'force_remove') {
      for (const businessId of input.businessIds) {
        const sub = await this.prisma.businessSubscription.findUnique({
          where: { businessId },
          select: { planTierId: true },
        });
        if (sub?.planTierId) {
          await this.addonSync.syncIncludedFromTier(businessId, sub.planTierId);
        } else {
          await this.prisma.businessAddon.updateMany({
            where: {
              businessId,
              addonId: input.addonId,
              status: BusinessAddonStatus.ACTIVE,
              source: BusinessAddonSource.INCLUDED,
            },
            data: {
              status: BusinessAddonStatus.CANCELED,
              canceledAt: new Date(),
            },
          });
        }
      }
    }

    // keep_grandfathered: catalog already updated; leave BusinessAddon rows alone
    // and open an Operations campaign for bulk notify / extend / migrate.
    if (
      input.policy === 'keep_grandfathered' &&
      input.businessIds.length > 0
    ) {
      const effectiveAt = input.notifyEffectiveDate
        ? new Date(input.notifyEffectiveDate)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return d;
          })();
      const removedAddons = await this.entitlementDiff.resolveAddons([
        input.addonId,
      ]);
      const diff: EntitlementChangeDiff = {
        addons: {
          removed: removedAddons,
          added: [],
        },
      };
      await this.operationsCampaigns.openOrMergeCampaign({
        type: EntitlementChangeCampaignType.ADDON_PACKAGING,
        summary: `${input.addonName} no longer included for some subscribers`,
        message: formatEntitlementChangeDetail({
          type: 'ADDON_PACKAGING',
          diff,
          fallbackMessage:
            input.notifyMessage ||
            'This add-on is no longer included with your tier. Upgrade or purchase it separately to keep access after the effective date.',
        }),
        policy: EntitlementChangeCampaignPolicy.KEEP_GRANDFATHERED,
        addonId: input.addonId,
        businessIds: input.businessIds,
        effectiveAt,
        actor: input.actor,
        payload: {
          addonId: input.addonId,
          diff,
        },
      });
    }

    let notifiedCount = 0;
    if (input.notifyOwners && input.businessIds.length > 0) {
      notifiedCount = await this.notifyAffectedOwners({
        addonName: input.addonName,
        policy: input.policy,
        businessIds: input.businessIds,
        notifyEffectiveDate: input.notifyEffectiveDate,
        notifyMessage: input.notifyMessage,
      });
    }

    return { notifiedCount };
  }

  private async notifyAffectedOwners(input: {
    addonName: string;
    policy: AddonSubscriberPolicy;
    businessIds: string[];
    notifyEffectiveDate?: string;
    notifyMessage?: string;
  }): Promise<number> {
    const summaryByPolicy: Record<AddonSubscriberPolicy, string> = {
      keep_grandfathered:
        'You keep this feature for now (grandfathered). New packaging applies to new subscribers.',
      force_remove: 'This feature is no longer included with your current tier.',
      convert_to_purchased:
        'This feature remains available, but it is now billed as a paid add-on.',
    };

    const memberships = await this.prisma.businessMembership.findMany({
      where: {
        businessId: { in: input.businessIds },
        role: BusinessMemberRole.OWNER,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        business: { select: { id: true, name: true } },
      },
    });

    let sent = 0;
    for (const membership of memberships) {
      const email = membership.user.email?.trim();
      if (!email) continue;
      try {
        await this.emailNotificationService.enqueueTransactionalEmail({
          businessId: membership.businessId,
          emailType: 'platform.addon_packaging_change',
          toEmail: email,
          userId: membership.user.id,
          entityType: 'Addon',
          entityId: input.addonName,
          idempotencyKey: `addon-packaging:${input.addonName}:${membership.businessId}:${input.policy}:${input.notifyEffectiveDate ?? 'now'}`,
          variables: {
            'owner.name': formatUserName(membership.user) || 'there',
            'owner.email': email,
            'business.name': membership.business.name,
            'addon.name': input.addonName,
            'change.summary': summaryByPolicy[input.policy],
            'change.detail': input.notifyMessage?.trim() || '',
            'change.effective': input.notifyEffectiveDate
              ? `Effective date: ${input.notifyEffectiveDate}`
              : 'This change applies immediately.',
          },
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `Failed to enqueue add-on packaging email for business ${membership.businessId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return sent;
  }

  async softDelete(id: string, actor: RequestUser) {
    await this.requireAddon(id);
    await this.prisma.addon.update({
      where: { id },
      data: { status: AddonStatus.ARCHIVED, deletedAt: new Date() },
    });
    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.addon.archived',
      entityType: 'Addon',
      entityId: id,
    });
    return { success: true };
  }

  /** Catalog of independent add-ons a business can purchase (not already included). */
  async listPurchasableForBusiness(businessId: string) {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      select: { planTierId: true },
    });

    const includedIds = new Set<string>();
    if (subscription?.planTierId) {
      const [dependent, included] = await Promise.all([
        this.prisma.addonTierLink.findMany({
          where: { tierId: subscription.planTierId },
          select: { addonId: true },
        }),
        this.prisma.tierIncludedAddon.findMany({
          where: { tierId: subscription.planTierId },
          select: { addonId: true },
        }),
      ]);
      for (const row of [...dependent, ...included]) {
        includedIds.add(row.addonId);
      }
    }

    const purchased = await this.prisma.businessAddon.findMany({
      where: {
        businessId,
        status: BusinessAddonStatus.ACTIVE,
        source: BusinessAddonSource.PURCHASED,
      },
      select: { addonId: true },
    });
    for (const row of purchased) {
      includedIds.add(row.addonId);
    }

    const items = await this.prisma.addon.findMany({
      where: {
        deletedAt: null,
        purchaseMode: AddonPurchaseMode.INDEPENDENT,
        status: AddonStatus.PUBLISHED,
        isPublic: true,
        id: { notIn: [...includedIds] },
      },
      include: addonInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return items.map((a) => this.toDto(a));
  }

  private async handleModeFlip(existing: AddonDetail, dto: UpdateAddonDto) {
    // INDEPENDENT → DEPENDENT (M2): block if active purchases unless confirmed
    if (
      existing.purchaseMode === AddonPurchaseMode.INDEPENDENT &&
      dto.purchaseMode === AddonPurchaseMode.DEPENDENT
    ) {
      const activePurchases = await this.prisma.businessAddon.count({
        where: {
          addonId: existing.id,
          status: BusinessAddonStatus.ACTIVE,
          source: BusinessAddonSource.PURCHASED,
        },
      });
      if (activePurchases > 0 && !dto.confirmModeFlip) {
        throw new AppException(
          ErrorCode.ADDON_MODE_FLIP_BLOCKED,
          `${activePurchases} business(es) have this add-on purchased. Pass confirmModeFlip=true with a reason to convert.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const tierIds = dto.tierIds ?? [];
      if (tierIds.length === 0) {
        throw new AppException(
          ErrorCode.ADDON_TIER_LINK_REQUIRED,
          'Dependent add-on must link to at least one tier',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // DEPENDENT → INDEPENDENT (M3): require a sellable monthly price
    if (
      existing.purchaseMode === AddonPurchaseMode.DEPENDENT &&
      dto.purchaseMode === AddonPurchaseMode.INDEPENDENT
    ) {
      const price =
        dto.priceMonthly !== undefined
          ? dto.priceMonthly
          : existing.priceMonthly?.toNumber();
      if (price === undefined || price === null) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'Flipping to independent requires a monthly price',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private validateModeFields(
    mode: AddonPurchaseMode,
    dto: {
      purchaseMode: AddonPurchaseMode;
      priceMonthly?: number | null;
      tierIds?: string[];
    },
  ) {
    if (mode === AddonPurchaseMode.DEPENDENT) {
      if (!dto.tierIds || dto.tierIds.length === 0) {
        throw new AppException(
          ErrorCode.ADDON_TIER_LINK_REQUIRED,
          'Dependent add-on must be linked to at least one tier',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (mode === AddonPurchaseMode.INDEPENDENT) {
      if (dto.priceMonthly === undefined || dto.priceMonthly === null) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'Independent add-on requires a monthly price',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private async requireAddon(id: string): Promise<AddonDetail> {
    const addon = await this.prisma.addon.findFirst({
      where: { id, deletedAt: null },
      include: addonInclude,
    });
    if (!addon) {
      throw new AppException(
        ErrorCode.ADDON_NOT_FOUND,
        'Add-on not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return addon;
  }

  private async assertCapability(capabilityId: string) {
    const cap = await this.prisma.capability.findFirst({
      where: {
        id: capabilityId,
        deletedAt: null,
        status: CapabilityStatus.ACTIVE,
      },
    });
    if (!cap) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Capability not found or inactive',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertTiersExist(tierIds: string[]) {
    const count = await this.prisma.planTier.count({
      where: { id: { in: tierIds }, deletedAt: null },
    });
    if (count !== tierIds.length) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'One or more tiers were not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private toDto(addon: AddonDetail) {
    return {
      id: addon.id,
      key: addon.key,
      name: addon.name,
      description: addon.description,
      purchaseMode: addon.purchaseMode,
      status: addon.status,
      isPublic: addon.isPublic,
      priceMonthly: addon.priceMonthly?.toString() ?? null,
      priceYearly: addon.priceYearly?.toString() ?? null,
      staffLimitDelta: addon.staffLimitDelta,
      locationLimitDelta: addon.locationLimitDelta,
      capability: addon.capability,
      sortOrder: addon.sortOrder,
      metadata: addon.metadata,
      tierLinks: addon.tierLinks.map((l) => ({
        tierId: l.tier.id,
        key: l.tier.key,
        name: l.tier.name,
        status: l.tier.status,
      })),
      includedInTiers: addon.includedInTiers.map((l) => ({
        tierId: l.tier.id,
        key: l.tier.key,
        name: l.tier.name,
        status: l.tier.status,
      })),
      createdAt: addon.createdAt.toISOString(),
      updatedAt: addon.updatedAt.toISOString(),
    };
  }
}
