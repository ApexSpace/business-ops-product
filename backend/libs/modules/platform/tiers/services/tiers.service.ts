import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AddonPurchaseMode,
  AddonStatus,
  CapabilityStatus,
  EntitlementChangeCampaignPolicy,
  EntitlementChangeCampaignType,
  PlanTierStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { slugify, withSlugSuffix } from '@app/common/utils/slug.util';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessCapabilitySyncService } from '@app/modules/platform/business/services/business-capability-sync.service';
import { BusinessAddonSyncService } from '@app/modules/platform/business/services/business-addon-sync.service';
import { EntitlementService } from '@app/modules/platform/business/services/entitlement.service';
import { OperationsCampaignService } from '@app/modules/platform/operations/services/operations-campaign.service';
import { EntitlementChangeDiffService } from '@app/modules/platform/operations/services/entitlement-change-diff.service';
import { StripePlatformPlanMappingService } from '@app/modules/platform/billing/stripe/services/stripe-platform-plan-mapping.service';
import { StripePlatformTierPriceSyncService } from '@app/modules/platform/billing/stripe/services/stripe-platform-tier-price-sync.service';
import {
  formatEntitlementChangeDetail,
  type EntitlementChangeDiff,
} from '@app/modules/platform/operations/utils/entitlement-change-diff.util';
import {
  CreateTierDto,
  ListTiersQueryDto,
  PublishTierVersionDto,
  UpdateTierDto,
} from '../dto/tier.dto';

const tierInclude = {
  capabilities: {
    include: { capability: { select: { id: true, key: true, name: true, status: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
  includedAddons: {
    include: {
      addon: {
        select: {
          id: true,
          key: true,
          name: true,
          purchaseMode: true,
          status: true,
          priceMonthly: true,
        },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  dependentAddonLinks: {
    include: {
      addon: {
        select: {
          id: true,
          key: true,
          name: true,
          purchaseMode: true,
          status: true,
        },
      },
    },
  },
  versions: { orderBy: { version: 'desc' as const }, take: 10 },
} satisfies Prisma.PlanTierInclude;

export type TierDetail = Prisma.PlanTierGetPayload<{ include: typeof tierInclude }>;

@Injectable()
export class TiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly operationsCampaigns: OperationsCampaignService,
    private readonly entitlementDiff: EntitlementChangeDiffService,
    private readonly capabilitySync: BusinessCapabilitySyncService,
    private readonly addonSync: BusinessAddonSyncService,
    private readonly entitlementService: EntitlementService,
    private readonly stripeTierPriceSync: StripePlatformTierPriceSyncService,
    private readonly planMapping: StripePlatformPlanMappingService,
  ) {}

  async list(query: ListTiersQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Prisma.PlanTierWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.isPublic !== undefined ? { isPublic: query.isPublic } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { key: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.planTier.findMany({
        where,
        include: tierInclude,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.planTier.count({ where }),
    ]);

    return {
      items: items.map((t) => this.toDto(t)),
      meta: { total, page, limit },
    };
  }

  async getById(id: string) {
    const tier = await this.requireTier(id);
    return this.toDto(tier);
  }

  async create(dto: CreateTierDto, actor: RequestUser) {
    const key = await this.resolveUniqueKey(dto.key ?? dto.name);
    const slug = await this.resolveUniqueSlug(dto.slug ?? dto.name);
    const sortOrder =
      dto.sortOrder ??
      ((await this.prisma.planTier.aggregate({
        where: { deletedAt: null },
        _max: { sortOrder: true },
      }))._max.sortOrder ?? 0) + 1;

    if (dto.capabilityIds?.length) {
      await this.assertCapabilitiesActive(dto.capabilityIds);
    }
    if (dto.includedAddonIds?.length) {
      await this.assertIndependentAddons(dto.includedAddonIds);
    }

    const tier = await this.prisma.$transaction(async (tx) => {
      const created = await tx.planTier.create({
        data: {
          key,
          slug,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          status: dto.status ?? PlanTierStatus.DRAFT,
          isPublic: dto.isPublic ?? true,
          priceMonthly: dto.priceMonthly,
          priceYearly: dto.priceYearly,
          setupFee: dto.setupFee,
          trialDays: dto.trialDays,
          staffLimit: dto.staffLimit ?? null,
          locationLimit: dto.locationLimit ?? null,
          currency: dto.currency ?? 'USD',
          sortOrder,
          metadata: this.planMapping.sanitizeClientTierMetadata(
            dto.metadata,
          ) as Prisma.InputJsonValue | undefined,
        },
      });

      if (dto.capabilityIds?.length) {
        await tx.planTierCapability.createMany({
          data: dto.capabilityIds.map((capabilityId, i) => ({
            planTierId: created.id,
            capabilityId,
            sortOrder: i,
          })),
        });
      }

      if (dto.includedAddonIds?.length) {
        await tx.tierIncludedAddon.createMany({
          data: dto.includedAddonIds.map((addonId, i) => ({
            tierId: created.id,
            addonId,
            sortOrder: i,
          })),
        });
      }

      if ((dto.status ?? PlanTierStatus.DRAFT) === PlanTierStatus.PUBLISHED) {
        await this.createVersion(tx, created.id);
      }

      return created;
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.tier.created',
      entityType: 'Tier',
      entityId: tier.id,
      metadata: { key, slug },
    });

    const stripeSync = await this.safeSyncStripePrices(tier.id);
    const dtoResult = await this.getById(tier.id);
    return { ...dtoResult, stripeSync };
  }

  async update(id: string, dto: UpdateTierDto, actor: RequestUser) {
    const existing = await this.requireTier(id);

    if (dto.capabilityIds) {
      await this.assertCapabilitiesActive(dto.capabilityIds);
    }
    if (dto.includedAddonIds) {
      await this.assertIndependentAddons(dto.includedAddonIds);
    }

    const becomingPublished =
      dto.status === PlanTierStatus.PUBLISHED &&
      existing.status !== PlanTierStatus.PUBLISHED;
    const materialChange =
      dto.priceMonthly !== undefined ||
      dto.priceYearly !== undefined ||
      dto.staffLimit !== undefined ||
      dto.locationLimit !== undefined ||
      dto.capabilityIds !== undefined ||
      dto.includedAddonIds !== undefined;

    const beforeCapabilityIds = existing.capabilities.map((c) => c.capabilityId);
    const beforeIncludedAddonIds = existing.includedAddons.map((a) => a.addonId);
    const beforePriceMonthly = existing.priceMonthly?.toNumber() ?? null;
    const beforePriceYearly = existing.priceYearly?.toNumber() ?? null;

    let createdVersionId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.planTier.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
          ...(dto.priceMonthly !== undefined
            ? { priceMonthly: dto.priceMonthly }
            : {}),
          ...(dto.priceYearly !== undefined
            ? { priceYearly: dto.priceYearly }
            : {}),
          ...(dto.setupFee !== undefined ? { setupFee: dto.setupFee } : {}),
          ...(dto.trialDays !== undefined ? { trialDays: dto.trialDays } : {}),
          ...(dto.staffLimit !== undefined ? { staffLimit: dto.staffLimit } : {}),
          ...(dto.locationLimit !== undefined
            ? { locationLimit: dto.locationLimit }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.metadata !== undefined
            ? {
                metadata: this.planMapping.sanitizeClientTierMetadata(
                  dto.metadata,
                  existing.metadata,
                ) as Prisma.InputJsonValue,
              }
            : {}),
        },
      });

      if (dto.capabilityIds) {
        await tx.planTierCapability.deleteMany({ where: { planTierId: id } });
        if (dto.capabilityIds.length) {
          await tx.planTierCapability.createMany({
            data: dto.capabilityIds.map((capabilityId, i) => ({
              planTierId: id,
              capabilityId,
              sortOrder: i,
            })),
          });
        }
      }

      if (dto.includedAddonIds) {
        await tx.tierIncludedAddon.deleteMany({ where: { tierId: id } });
        if (dto.includedAddonIds.length) {
          await tx.tierIncludedAddon.createMany({
            data: dto.includedAddonIds.map((addonId, i) => ({
              tierId: id,
              addonId,
              sortOrder: i,
            })),
          });
        }
      }

      if (
        becomingPublished ||
        (existing.status === PlanTierStatus.PUBLISHED && materialChange)
      ) {
        const version = await this.createVersion(tx, id);
        createdVersionId = version.id;
      }
    });

    const mode = dto.publishMode ?? 'new_buyers_only';
    const isLive =
      existing.status === PlanTierStatus.PUBLISHED || becomingPublished;

    if (isLive) {
      await this.handleLiveTierImpact({
        tierId: id,
        tierName: dto.name?.trim() || existing.name,
        beforeCapabilityIds,
        afterCapabilityIds: dto.capabilityIds ?? beforeCapabilityIds,
        beforeIncludedAddonIds,
        afterIncludedAddonIds: dto.includedAddonIds ?? beforeIncludedAddonIds,
        beforePriceMonthly,
        beforePriceYearly,
        afterPriceMonthly:
          dto.priceMonthly !== undefined
            ? dto.priceMonthly
            : beforePriceMonthly,
        afterPriceYearly:
          dto.priceYearly !== undefined ? dto.priceYearly : beforePriceYearly,
        toVersionId: createdVersionId,
        mode,
        actor,
      });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.tier.updated',
      entityType: 'Tier',
      entityId: id,
      metadata: { publishMode: mode },
    });

    // Catalog is source of truth — create/rotate Stripe Prices to match Decimals.
    const priceTouched =
      dto.priceMonthly !== undefined ||
      dto.priceYearly !== undefined ||
      becomingPublished;
    const stripeSync = priceTouched
      ? await this.stripeTierPriceSync.syncTierCatalogPrices(id)
      : await this.stripeTierPriceSync.getSyncStatus(id);

    const dtoResult = await this.getById(id);
    return { ...dtoResult, stripeSync };
  }

  async syncStripePrices(id: string, actor: RequestUser) {
    await this.requireTier(id);
    const stripeSync =
      await this.stripeTierPriceSync.syncTierCatalogPrices(id);
    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.tier.stripe_prices_synced',
      entityType: 'Tier',
      entityId: id,
      metadata: stripeSync as unknown as Record<string, unknown>,
    });
    const dtoResult = await this.getById(id);
    return { ...dtoResult, stripeSync };
  }

  async getStripeSyncStatus(id: string) {
    await this.requireTier(id);
    return this.stripeTierPriceSync.getSyncStatus(id);
  }

  private async safeSyncStripePrices(tierId: string) {
    try {
      return await this.stripeTierPriceSync.syncTierCatalogPrices(tierId);
    } catch (error) {
      // Draft create without Stripe should not block; published save fails closed.
      if (error instanceof AppException) throw error;
      return this.stripeTierPriceSync.getSyncStatus(tierId);
    }
  }

  async publishVersion(
    id: string,
    dto: PublishTierVersionDto,
    actor: RequestUser,
  ) {
    await this.requireTier(id);
    const version = await this.prisma.$transaction(async (tx) => {
      await tx.planTier.update({
        where: { id },
        data: { status: PlanTierStatus.PUBLISHED },
      });
      return this.createVersion(tx, id);
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.tier.version_published',
      entityType: 'TierVersion',
      entityId: version.id,
      metadata: { tierId: id, mode: dto.mode ?? 'new_buyers_only', reason: dto.reason },
    });

    const stripeSync =
      await this.stripeTierPriceSync.syncTierCatalogPrices(id);
    const dtoResult = await this.getById(id);
    return { ...dtoResult, stripeSync };
  }

  async softDelete(id: string, actor: RequestUser) {
    const tier = await this.requireTier(id);

    const soleDependent = await this.prisma.addon.findMany({
      where: {
        deletedAt: null,
        purchaseMode: AddonPurchaseMode.DEPENDENT,
        tierLinks: { some: { tierId: id } },
      },
      include: { tierLinks: true },
    });

    for (const addon of soleDependent) {
      if (addon.tierLinks.length === 1 && addon.tierLinks[0]?.tierId === id) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          `Cannot archive tier: dependent add-on "${addon.name}" is only linked here. Re-link or archive the add-on first.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.prisma.planTier.update({
      where: { id },
      data: { status: PlanTierStatus.ARCHIVED, deletedAt: new Date() },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.tier.archived',
      entityType: 'Tier',
      entityId: id,
      metadata: { key: tier.key },
    });

    return { success: true };
  }

  async getLatestVersion(tierId: string) {
    return this.prisma.tierVersion.findFirst({
      where: { tierId },
      orderBy: { version: 'desc' },
    });
  }

  private async createVersion(tx: Prisma.TransactionClient, tierId: string) {
    const tier = await tx.planTier.findFirstOrThrow({
      where: { id: tierId },
      include: {
        capabilities: true,
        includedAddons: true,
        dependentAddonLinks: true,
      },
    });

    const last = await tx.tierVersion.findFirst({
      where: { tierId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return tx.tierVersion.create({
      data: {
        tierId,
        version: (last?.version ?? 0) + 1,
        priceMonthly: tier.priceMonthly,
        priceYearly: tier.priceYearly,
        staffLimit: tier.staffLimit,
        locationLimit: tier.locationLimit,
        capabilityIds: tier.capabilities.map((c) => c.capabilityId),
        includedAddonIds: tier.includedAddons.map((a) => a.addonId),
        dependentAddonIds: tier.dependentAddonLinks.map((a) => a.addonId),
      },
    });
  }

  private async handleLiveTierImpact(input: {
    tierId: string;
    tierName: string;
    beforeCapabilityIds: string[];
    afterCapabilityIds: string[];
    beforeIncludedAddonIds: string[];
    afterIncludedAddonIds: string[];
    beforePriceMonthly: number | null;
    beforePriceYearly: number | null;
    afterPriceMonthly: number | null;
    afterPriceYearly: number | null;
    toVersionId: string | null;
    mode: 'new_buyers_only' | 'apply_grants' | 'force_migrate';
    actor: RequestUser;
  }) {
    const beforeCaps = new Set(input.beforeCapabilityIds);
    const afterCaps = new Set(input.afterCapabilityIds);
    const addedCaps = [...afterCaps].filter((id) => !beforeCaps.has(id));
    const removedCaps = [...beforeCaps].filter((id) => !afterCaps.has(id));

    const beforeAddons = new Set(input.beforeIncludedAddonIds);
    const afterAddons = new Set(input.afterIncludedAddonIds);
    const addedAddons = [...afterAddons].filter((id) => !beforeAddons.has(id));
    const removedAddons = [...beforeAddons].filter(
      (id) => !afterAddons.has(id),
    );

    const priceChanged =
      input.beforePriceMonthly !== input.afterPriceMonthly ||
      input.beforePriceYearly !== input.afterPriceYearly;

    const subscribers = await this.prisma.businessSubscription.findMany({
      where: {
        planTierId: input.tierId,
        business: { deletedAt: null },
      },
      select: { businessId: true },
    });
    const businessIds = subscribers.map((s) => s.businessId);

    // Capability adds → auto-grant (goodwill), same as add-ons.
    if (addedCaps.length > 0) {
      const grant = await this.capabilitySync.grantCapabilitiesForTiers(
        addedCaps,
        [input.tierId],
      );
      await Promise.all(
        grant.grantedBusinessIds.map((id) =>
          this.entitlementService.invalidate(id),
        ),
      );
    }

    // Included add-on adds on this tier → safe grant.
    for (const addonId of addedAddons) {
      await this.addonSync.grantIncludedAddonForTiers(addonId, [input.tierId]);
    }

    // Capability removals → campaign with full capability + service inventory.
    if (removedCaps.length > 0 && businessIds.length > 0) {
      const [removedResolved, afterResolved, beforeResolved, addedResolved] =
        await Promise.all([
          this.entitlementDiff.resolveCapabilities(removedCaps),
          this.entitlementDiff.resolveCapabilities([...afterCaps]),
          this.entitlementDiff.resolveCapabilities([...beforeCaps]),
          this.entitlementDiff.resolveCapabilities(addedCaps),
        ]);
      const diff: EntitlementChangeDiff = {
        capabilities: {
          before: beforeResolved,
          after: afterResolved,
          added: addedResolved,
          removed: removedResolved,
        },
      };
      const defaultEffective = new Date();
      defaultEffective.setDate(defaultEffective.getDate() + 30);
      const message = formatEntitlementChangeDetail({
        type: 'TIER_CAPABILITY',
        diff,
      });
      const campaign = await this.operationsCampaigns.openOrMergeCampaign({
        type: EntitlementChangeCampaignType.TIER_CAPABILITY,
        summary: `Capabilities changed on ${input.tierName}`,
        message,
        policy: EntitlementChangeCampaignPolicy.KEEP_GRANDFATHERED,
        tierId: input.tierId,
        businessIds,
        effectiveAt: defaultEffective,
        actor: input.actor,
        payload: {
          removedCapabilityIds: removedCaps,
          addedCapabilityIds: addedCaps,
          beforeCapabilityIds: [...beforeCaps],
          afterCapabilityIds: [...afterCaps],
          diff,
        },
      });

      if (input.mode === 'force_migrate' && campaign?.id) {
        await this.operationsCampaigns.migrate(
          campaign.id,
          { businessIds, policy: EntitlementChangeCampaignPolicy.FORCE_REMOVE },
          input.actor,
        );
      }
    }

    // Included add-on removals → packaging campaign with capability/services.
    if (removedAddons.length > 0 && businessIds.length > 0) {
      const [removedAddonRows, afterAddonRows, beforeAddonRows, addedAddonRows] =
        await Promise.all([
          this.entitlementDiff.resolveAddons(removedAddons),
          this.entitlementDiff.resolveAddons([...afterAddons]),
          this.entitlementDiff.resolveAddons([...beforeAddons]),
          this.entitlementDiff.resolveAddons(addedAddons),
        ]);
      const diff: EntitlementChangeDiff = {
        addons: {
          before: beforeAddonRows,
          after: afterAddonRows,
          added: addedAddonRows,
          removed: removedAddonRows,
        },
      };
      const defaultEffective = new Date();
      defaultEffective.setDate(defaultEffective.getDate() + 30);
      const primaryAddon = removedAddonRows[0];
      await this.operationsCampaigns.openOrMergeCampaign({
        type: EntitlementChangeCampaignType.ADDON_PACKAGING,
        summary: `Add-on packaging changed on ${input.tierName}`,
        message: formatEntitlementChangeDetail({
          type: 'ADDON_PACKAGING',
          diff,
        }),
        policy: EntitlementChangeCampaignPolicy.KEEP_GRANDFATHERED,
        tierId: input.tierId,
        addonId: primaryAddon?.id,
        businessIds,
        effectiveAt: defaultEffective,
        actor: input.actor,
        payload: {
          removedAddonIds: removedAddons,
          addedAddonIds: addedAddons,
          beforeAddonIds: [...beforeAddons],
          afterAddonIds: [...afterAddons],
          diff,
        },
      });
    }

    // Price change → campaign; force_migrate applies immediately.
    if (priceChanged && businessIds.length > 0) {
      const defaultEffective = new Date();
      defaultEffective.setDate(defaultEffective.getDate() + 30);
      const oldMo = formatMoney(input.beforePriceMonthly);
      const newMo = formatMoney(input.afterPriceMonthly);
      const oldYr = formatMoney(input.beforePriceYearly);
      const newYr = formatMoney(input.afterPriceYearly);
      const diff: EntitlementChangeDiff = {
        prices: {
          previousPriceMonthly: input.beforePriceMonthly,
          priceMonthly: input.afterPriceMonthly,
          previousPriceYearly: input.beforePriceYearly,
          priceYearly: input.afterPriceYearly,
        },
      };
      const campaign = await this.operationsCampaigns.openOrMergeCampaign({
        type: EntitlementChangeCampaignType.TIER_PRICE,
        summary: `Price updated for ${input.tierName}: ${oldMo}/mo → ${newMo}/mo`,
        message: formatEntitlementChangeDetail({
          type: 'TIER_PRICE',
          diff,
          fallbackMessage: [
            `Your plan price for ${input.tierName} is changing.`,
            `Monthly: ${oldMo} → ${newMo}.`,
            `Yearly: ${oldYr} → ${newYr}.`,
            'Your current rate stays until the effective date unless migrated earlier.',
          ].join(' '),
        }),
        policy: EntitlementChangeCampaignPolicy.APPLY_NEW_PRICE,
        tierId: input.tierId,
        businessIds,
        effectiveAt: defaultEffective,
        actor: input.actor,
        payload: {
          priceMonthly: input.afterPriceMonthly,
          priceYearly: input.afterPriceYearly,
          previousPriceMonthly: input.beforePriceMonthly,
          previousPriceYearly: input.beforePriceYearly,
          tierVersionId: input.toVersionId,
          tierId: input.tierId,
          diff,
        },
      });

      if (input.mode === 'force_migrate' && campaign?.id) {
        await this.operationsCampaigns.migrate(
          campaign.id,
          {
            businessIds,
            policy: EntitlementChangeCampaignPolicy.APPLY_NEW_PRICE,
          },
          input.actor,
        );
      }
    }
  }

  private async requireTier(id: string): Promise<TierDetail> {
    const tier = await this.prisma.planTier.findFirst({
      where: { id, deletedAt: null },
      include: tierInclude,
    });
    if (!tier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return tier;
  }

  private async resolveUniqueKey(raw: string): Promise<string> {
    const base = slugify(raw).replace(/-/g, '_') || 'tier';
    let key = base;
    let i = 0;
    while (
      await this.prisma.planTier.findFirst({
        where: { key, deletedAt: null },
        select: { id: true },
      })
    ) {
      i += 1;
      key = `${base}_${i}`;
    }
    return key;
  }

  private async resolveUniqueSlug(raw: string): Promise<string> {
    let slug = slugify(raw) || 'tier';
    let i = 0;
    while (
      await this.prisma.planTier.findFirst({
        where: { slug, planGroupId: null, deletedAt: null },
        select: { id: true },
      })
    ) {
      i += 1;
      slug = withSlugSuffix(slugify(raw) || 'tier', i);
    }
    return slug;
  }

  private async assertCapabilitiesActive(ids: string[]) {
    const count = await this.prisma.capability.count({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: CapabilityStatus.ACTIVE,
      },
    });
    if (count !== ids.length) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'One or more capabilities are invalid or inactive',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertIndependentAddons(ids: string[]) {
    const addons = await this.prisma.addon.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, purchaseMode: true, status: true },
    });
    if (addons.length !== ids.length) {
      throw new AppException(
        ErrorCode.ADDON_NOT_FOUND,
        'One or more add-ons were not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const dependent = addons.find(
      (a) => a.purchaseMode === AddonPurchaseMode.DEPENDENT,
    );
    if (dependent) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Dependent add-ons must be linked from the Add-on form, not as included independents',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private toDto(tier: TierDetail) {
    const stripeMeta =
      this.planMapping.parseTierStripeMetadata(tier.metadata) ?? null;

    return {
      id: tier.id,
      key: tier.key,
      slug: tier.slug,
      name: tier.name,
      description: tier.description,
      status: tier.status,
      isPublic: tier.isPublic,
      priceMonthly: tier.priceMonthly?.toString() ?? null,
      priceYearly: tier.priceYearly?.toString() ?? null,
      setupFee: tier.setupFee?.toString() ?? null,
      trialDays: tier.trialDays,
      staffLimit: tier.staffLimit,
      locationLimit: tier.locationLimit,
      currency: tier.currency,
      sortOrder: tier.sortOrder,
      metadata: tier.metadata,
      stripe: {
        productId: stripeMeta?.productId ?? null,
        monthlyPriceId: stripeMeta?.monthlyPriceId ?? null,
        yearlyPriceId: stripeMeta?.yearlyPriceId ?? null,
      },
      capabilities: tier.capabilities.map((c) => ({
        id: c.capability.id,
        key: c.capability.key,
        name: c.capability.name,
        status: c.capability.status,
        sortOrder: c.sortOrder,
      })),
      includedAddons: tier.includedAddons.map((row) => ({
        id: row.addon.id,
        key: row.addon.key,
        name: row.addon.name,
        purchaseMode: row.addon.purchaseMode,
        status: row.addon.status,
        priceMonthly: row.addon.priceMonthly?.toString() ?? null,
      })),
      dependentAddons: tier.dependentAddonLinks.map((row) => ({
        id: row.addon.id,
        key: row.addon.key,
        name: row.addon.name,
        purchaseMode: row.addon.purchaseMode,
        status: row.addon.status,
      })),
      versions: tier.versions.map((v) => ({
        id: v.id,
        version: v.version,
        priceMonthly: v.priceMonthly?.toString() ?? null,
        priceYearly: v.priceYearly?.toString() ?? null,
        staffLimit: v.staffLimit,
        locationLimit: v.locationLimit,
        publishedAt: v.publishedAt.toISOString(),
      })),
      createdAt: tier.createdAt.toISOString(),
      updatedAt: tier.updatedAt.toISOString(),
    };
  }
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `$${Number(value).toFixed(2)}`;
}
