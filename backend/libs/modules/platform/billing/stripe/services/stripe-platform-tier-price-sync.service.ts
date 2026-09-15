import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';
import type { PlanTierStripeMetadata } from '../types/stripe-platform-billing.types';

export type TierPriceSyncResult = {
  synced: boolean;
  stripeConfigured: boolean;
  productId: string | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  monthlyMatched: boolean | null;
  yearlyMatched: boolean | null;
  monthlyUnitAmount: number | null;
  yearlyUnitAmount: number | null;
  catalogMonthlyCents: number | null;
  catalogYearlyCents: number | null;
  createdMonthlyPrice: boolean;
  createdYearlyPrice: boolean;
  warnings: string[];
};

@Injectable()
export class StripePlatformTierPriceSyncService {
  private readonly logger = new Logger(StripePlatformTierPriceSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly planMapping: StripePlatformPlanMappingService,
  ) {}

  toCents(amount: number | Prisma.Decimal | string | null | undefined): number | null {
    if (amount == null || amount === '') return null;
    const n = typeof amount === 'number' ? amount : Number(amount.toString());
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  }

  /**
   * Ensure Stripe Product + Prices match catalog Decimals.
   * Creates new Prices when amount drifts (Stripe Prices are immutable).
   * Writes IDs back to PlanTier.metadata.stripe.
   */
  async syncTierCatalogPrices(tierId: string): Promise<TierPriceSyncResult> {
    const tier = await this.prisma.planTier.findFirst({
      where: { id: tierId, deletedAt: null },
    });
    if (!tier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const warnings: string[] = [];
    const catalogMonthlyCents = this.toCents(tier.priceMonthly);
    const catalogYearlyCents = this.toCents(tier.priceYearly);
    const currency = (tier.currency || 'USD').toLowerCase();

    if (!this.stripeApi.isConfigured()) {
      return {
        synced: false,
        stripeConfigured: false,
        productId: null,
        monthlyPriceId: null,
        yearlyPriceId: null,
        monthlyMatched: null,
        yearlyMatched: null,
        monthlyUnitAmount: null,
        yearlyUnitAmount: null,
        catalogMonthlyCents,
        catalogYearlyCents,
        createdMonthlyPrice: false,
        createdYearlyPrice: false,
        warnings: [
          'Stripe is not configured (STRIPE_SECRET_KEY). Catalog prices saved locally only.',
        ],
      };
    }

    const stripe = this.stripeApi.getClient();
    let meta = this.planMapping.parseTierStripeMetadata(tier.metadata) ?? {};
    let productId = meta.productId?.trim() || null;
    let monthlyPriceId = meta.monthlyPriceId?.trim() || null;
    let yearlyPriceId = meta.yearlyPriceId?.trim() || null;
    let createdMonthlyPrice = false;
    let createdYearlyPrice = false;
    let monthlyUnitAmount: number | null = null;
    let yearlyUnitAmount: number | null = null;
    let monthlyMatched: boolean | null = null;
    let yearlyMatched: boolean | null = null;

    try {
      if (!productId) {
        const product = await stripe.products.create({
          name: tier.name,
          metadata: {
            purpose: 'platform_tier',
            tierId: tier.id,
            tierKey: tier.key ?? '',
          },
        });
        productId = product.id;
      } else {
        await stripe.products.update(productId, {
          name: tier.name,
          metadata: {
            purpose: 'platform_tier',
            tierId: tier.id,
            tierKey: tier.key ?? '',
          },
        });
      }

      if (catalogMonthlyCents != null) {
        const ensured = await this.ensurePriceForAmount({
          existingPriceId: monthlyPriceId,
          productId,
          unitAmountCents: catalogMonthlyCents,
          currency,
          interval: 'month',
          tierId: tier.id,
        });
        monthlyPriceId = ensured.priceId;
        monthlyUnitAmount = ensured.unitAmount;
        monthlyMatched = ensured.matched;
        createdMonthlyPrice = ensured.created;
        if (ensured.previousPriceId && ensured.created) {
          await this.archivePriceQuietly(ensured.previousPriceId);
        }
      } else if (monthlyPriceId) {
        warnings.push(
          'Catalog monthly price is empty but a Stripe monthly Price ID exists — clear or set catalog amount.',
        );
        monthlyMatched = false;
      }

      if (catalogYearlyCents != null) {
        const ensured = await this.ensurePriceForAmount({
          existingPriceId: yearlyPriceId,
          productId,
          unitAmountCents: catalogYearlyCents,
          currency,
          interval: 'year',
          tierId: tier.id,
        });
        yearlyPriceId = ensured.priceId;
        yearlyUnitAmount = ensured.unitAmount;
        yearlyMatched = ensured.matched;
        createdYearlyPrice = ensured.created;
        if (ensured.previousPriceId && ensured.created) {
          await this.archivePriceQuietly(ensured.previousPriceId);
        }
      } else if (yearlyPriceId) {
        warnings.push(
          'Catalog yearly price is empty but a Stripe yearly Price ID exists — clear or set catalog amount.',
        );
        yearlyMatched = false;
      }

      const nextMeta: PlanTierStripeMetadata = {
        productId: productId ?? undefined,
        monthlyPriceId: monthlyPriceId ?? undefined,
        yearlyPriceId: yearlyPriceId ?? undefined,
      };

      // Persist price_id refs, then mirror display $ from Stripe unit_amount.
      const displayMonthly =
        monthlyUnitAmount != null
          ? new Prisma.Decimal(monthlyUnitAmount).div(100)
          : undefined;
      const displayYearly =
        yearlyUnitAmount != null
          ? new Prisma.Decimal(yearlyUnitAmount).div(100)
          : undefined;

      await this.prisma.planTier.update({
        where: { id: tier.id },
        data: {
          metadata: this.planMapping.mergeTierMetadata(
            tier.metadata,
            nextMeta,
          ) as Prisma.InputJsonValue,
          ...(displayMonthly != null ? { priceMonthly: displayMonthly } : {}),
          ...(displayYearly != null ? { priceYearly: displayYearly } : {}),
        },
      });

      return {
        synced: true,
        stripeConfigured: true,
        productId,
        monthlyPriceId,
        yearlyPriceId,
        monthlyMatched,
        yearlyMatched,
        monthlyUnitAmount,
        yearlyUnitAmount,
        catalogMonthlyCents: monthlyUnitAmount ?? catalogMonthlyCents,
        catalogYearlyCents: yearlyUnitAmount ?? catalogYearlyCents,
        createdMonthlyPrice,
        createdYearlyPrice,
        warnings,
      };
    } catch (error) {
      if (error instanceof AppException) throw error;
      this.stripeApi.logStripeError('tier price sync', error);
      throw new AppException(
        ErrorCode.STRIPE_PRICE_SYNC_FAILED,
        `Failed to sync Stripe prices for tier: ${
          error instanceof Error ? error.message : String(error)
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Assert mapped Stripe Prices match catalog. Throws on mismatch.
   * Used before checkout and before Ops migrate.
   */
  async assertCatalogMatchesStripe(tierId: string): Promise<void> {
    if (!this.stripeApi.isConfigured()) {
      return;
    }

    const tier = await this.prisma.planTier.findFirst({
      where: { id: tierId, deletedAt: null },
    });
    if (!tier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const meta = this.planMapping.parseTierStripeMetadata(tier.metadata);
    const monthlyCents = this.toCents(tier.priceMonthly);
    const yearlyCents = this.toCents(tier.priceYearly);
    const stripe = this.stripeApi.getClient();
    const mismatches: string[] = [];

    if (monthlyCents != null) {
      if (!meta?.monthlyPriceId) {
        mismatches.push('monthly Price ID missing for catalog monthly price');
      } else {
        const price = await stripe.prices.retrieve(meta.monthlyPriceId);
        if (price.unit_amount !== monthlyCents) {
          mismatches.push(
            `monthly Stripe Price ${meta.monthlyPriceId} is ${price.unit_amount} cents but catalog is ${monthlyCents} cents`,
          );
        }
      }
    }

    if (yearlyCents != null) {
      if (!meta?.yearlyPriceId) {
        mismatches.push('yearly Price ID missing for catalog yearly price');
      } else {
        const price = await stripe.prices.retrieve(meta.yearlyPriceId);
        if (price.unit_amount !== yearlyCents) {
          mismatches.push(
            `yearly Stripe Price ${meta.yearlyPriceId} is ${price.unit_amount} cents but catalog is ${yearlyCents} cents`,
          );
        }
      }
    }

    if (mismatches.length > 0) {
      throw new AppException(
        ErrorCode.STRIPE_PRICE_MISMATCH,
        `Stripe Price IDs do not match catalog: ${mismatches.join('; ')}. Re-save the tier to sync.`,
        HttpStatus.CONFLICT,
      );
    }
  }

  /**
   * Assert tier has active Stripe Price IDs for checkout/plan change (Stripe-owned).
   */
  async assertPriceIdsPresent(tierId: string): Promise<void> {
    if (!this.stripeApi.isConfigured()) {
      throw new AppException(
        ErrorCode.STRIPE_PRICE_SYNC_FAILED,
        'Stripe is not configured',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const tier = await this.prisma.planTier.findFirst({
      where: { id: tierId, deletedAt: null },
    });
    if (!tier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const meta = this.planMapping.parseTierStripeMetadata(tier.metadata);
    if (!meta?.monthlyPriceId && !meta?.yearlyPriceId) {
      throw new AppException(
        ErrorCode.STRIPE_PRICE_MISMATCH,
        'Tier has no Stripe Price IDs. Save the tier to create Prices first.',
        HttpStatus.CONFLICT,
      );
    }
    const stripe = this.stripeApi.getClient();
    for (const priceId of [meta.monthlyPriceId, meta.yearlyPriceId]) {
      if (!priceId) continue;
      const price = await stripe.prices.retrieve(priceId);
      if (price.active === false) {
        throw new AppException(
          ErrorCode.STRIPE_PRICE_MISMATCH,
          `Stripe Price ${priceId} is inactive`,
          HttpStatus.CONFLICT,
        );
      }
    }
  }

  async getSyncStatus(tierId: string): Promise<TierPriceSyncResult> {
    const tier = await this.prisma.planTier.findFirst({
      where: { id: tierId, deletedAt: null },
    });
    if (!tier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const catalogMonthlyCents = this.toCents(tier.priceMonthly);
    const catalogYearlyCents = this.toCents(tier.priceYearly);
    const meta = this.planMapping.parseTierStripeMetadata(tier.metadata) ?? {};

    if (!this.stripeApi.isConfigured()) {
      return {
        synced: false,
        stripeConfigured: false,
        productId: meta.productId ?? null,
        monthlyPriceId: meta.monthlyPriceId ?? null,
        yearlyPriceId: meta.yearlyPriceId ?? null,
        monthlyMatched: null,
        yearlyMatched: null,
        monthlyUnitAmount: null,
        yearlyUnitAmount: null,
        catalogMonthlyCents,
        catalogYearlyCents,
        createdMonthlyPrice: false,
        createdYearlyPrice: false,
        warnings: ['Stripe is not configured'],
      };
    }

    const stripe = this.stripeApi.getClient();
    let monthlyUnitAmount: number | null = null;
    let yearlyUnitAmount: number | null = null;
    let monthlyMatched: boolean | null = null;
    let yearlyMatched: boolean | null = null;
    const warnings: string[] = [];

    if (meta.monthlyPriceId) {
      try {
        const price = await stripe.prices.retrieve(meta.monthlyPriceId);
        monthlyUnitAmount = price.unit_amount;
        monthlyMatched =
          catalogMonthlyCents == null
            ? false
            : price.unit_amount === catalogMonthlyCents;
      } catch {
        warnings.push(`Cannot retrieve monthly Price ${meta.monthlyPriceId}`);
        monthlyMatched = false;
      }
    } else if (catalogMonthlyCents != null) {
      monthlyMatched = false;
      warnings.push('Monthly catalog price has no Stripe Price ID — sync required');
    }

    if (meta.yearlyPriceId) {
      try {
        const price = await stripe.prices.retrieve(meta.yearlyPriceId);
        yearlyUnitAmount = price.unit_amount;
        yearlyMatched =
          catalogYearlyCents == null
            ? false
            : price.unit_amount === catalogYearlyCents;
      } catch {
        warnings.push(`Cannot retrieve yearly Price ${meta.yearlyPriceId}`);
        yearlyMatched = false;
      }
    } else if (catalogYearlyCents != null) {
      yearlyMatched = false;
      warnings.push('Yearly catalog price has no Stripe Price ID — sync required');
    }

    const synced =
      (catalogMonthlyCents == null || monthlyMatched === true) &&
      (catalogYearlyCents == null || yearlyMatched === true);

    return {
      synced,
      stripeConfigured: true,
      productId: meta.productId ?? null,
      monthlyPriceId: meta.monthlyPriceId ?? null,
      yearlyPriceId: meta.yearlyPriceId ?? null,
      monthlyMatched,
      yearlyMatched,
      monthlyUnitAmount,
      yearlyUnitAmount,
      catalogMonthlyCents,
      catalogYearlyCents,
      createdMonthlyPrice: false,
      createdYearlyPrice: false,
      warnings,
    };
  }

  private async ensurePriceForAmount(input: {
    existingPriceId: string | null;
    productId: string;
    unitAmountCents: number;
    currency: string;
    interval: 'month' | 'year';
    tierId: string;
    purpose?: 'platform_tier' | 'platform_addon';
  }): Promise<{
    priceId: string;
    unitAmount: number;
    matched: boolean;
    created: boolean;
    previousPriceId: string | null;
  }> {
    const stripe = this.stripeApi.getClient();

    if (input.existingPriceId) {
      try {
        const existing = await stripe.prices.retrieve(input.existingPriceId);
        if (
          existing.unit_amount === input.unitAmountCents &&
          existing.currency === input.currency &&
          existing.active !== false
        ) {
          return {
            priceId: existing.id,
            unitAmount: existing.unit_amount ?? input.unitAmountCents,
            matched: true,
            created: false,
            previousPriceId: null,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Existing Stripe price ${input.existingPriceId} not readable; creating new: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const price = await stripe.prices.create({
      product: input.productId,
      unit_amount: input.unitAmountCents,
      currency: input.currency,
      recurring: { interval: input.interval },
      metadata: {
        purpose: input.purpose ?? 'platform_tier',
        ...(input.purpose === 'platform_addon'
          ? { addonId: input.tierId }
          : { tierId: input.tierId }),
        billingCycle: input.interval === 'month' ? 'MONTHLY' : 'YEARLY',
      },
    });

    return {
      priceId: price.id,
      unitAmount: price.unit_amount ?? input.unitAmountCents,
      matched: true,
      created: true,
      previousPriceId: input.existingPriceId,
    };
  }

  /**
   * Stripe-first catalog for independent add-ons: create/rotate Prices, store
   * price_id on Addon.metadata.stripe, mirror display $ from unit_amount.
   */
  async syncAddonCatalogPrices(addonId: string): Promise<TierPriceSyncResult> {
    const addon = await this.prisma.addon.findFirst({
      where: { id: addonId, deletedAt: null },
    });
    if (!addon) {
      throw new AppException(
        ErrorCode.ADDON_NOT_FOUND,
        'Add-on not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const warnings: string[] = [];
    const catalogMonthlyCents = this.toCents(addon.priceMonthly);
    const catalogYearlyCents = this.toCents(addon.priceYearly);
    const currency = 'usd';

    if (!this.stripeApi.isConfigured()) {
      return {
        synced: false,
        stripeConfigured: false,
        productId: null,
        monthlyPriceId: null,
        yearlyPriceId: null,
        monthlyMatched: null,
        yearlyMatched: null,
        monthlyUnitAmount: null,
        yearlyUnitAmount: null,
        catalogMonthlyCents,
        catalogYearlyCents,
        createdMonthlyPrice: false,
        createdYearlyPrice: false,
        warnings: [
          'Stripe is not configured (STRIPE_SECRET_KEY). Catalog prices saved locally only.',
        ],
      };
    }

    if (addon.purchaseMode !== 'INDEPENDENT') {
      return {
        synced: true,
        stripeConfigured: true,
        productId: null,
        monthlyPriceId: null,
        yearlyPriceId: null,
        monthlyMatched: null,
        yearlyMatched: null,
        monthlyUnitAmount: null,
        yearlyUnitAmount: null,
        catalogMonthlyCents,
        catalogYearlyCents,
        createdMonthlyPrice: false,
        createdYearlyPrice: false,
        warnings: ['Dependent add-ons do not create Stripe Prices'],
      };
    }

    const stripe = this.stripeApi.getClient();
    let meta = this.planMapping.parseTierStripeMetadata(addon.metadata) ?? {};
    let productId = meta.productId?.trim() || null;
    let monthlyPriceId = meta.monthlyPriceId?.trim() || null;
    let yearlyPriceId = meta.yearlyPriceId?.trim() || null;
    let createdMonthlyPrice = false;
    let createdYearlyPrice = false;
    let monthlyUnitAmount: number | null = null;
    let yearlyUnitAmount: number | null = null;
    let monthlyMatched: boolean | null = null;
    let yearlyMatched: boolean | null = null;

    try {
      if (!productId) {
        const product = await stripe.products.create({
          name: addon.name,
          metadata: {
            purpose: 'platform_addon',
            addonId: addon.id,
            addonKey: addon.key ?? '',
          },
        });
        productId = product.id;
      } else {
        await stripe.products.update(productId, {
          name: addon.name,
          metadata: {
            purpose: 'platform_addon',
            addonId: addon.id,
            addonKey: addon.key ?? '',
          },
        });
      }

      if (catalogMonthlyCents != null) {
        const ensured = await this.ensurePriceForAmount({
          existingPriceId: monthlyPriceId,
          productId,
          unitAmountCents: catalogMonthlyCents,
          currency,
          interval: 'month',
          tierId: addon.id,
          purpose: 'platform_addon',
        });
        monthlyPriceId = ensured.priceId;
        monthlyUnitAmount = ensured.unitAmount;
        monthlyMatched = ensured.matched;
        createdMonthlyPrice = ensured.created;
        if (ensured.previousPriceId && ensured.created) {
          await this.archivePriceQuietly(ensured.previousPriceId);
        }
      }

      if (catalogYearlyCents != null) {
        const ensured = await this.ensurePriceForAmount({
          existingPriceId: yearlyPriceId,
          productId,
          unitAmountCents: catalogYearlyCents,
          currency,
          interval: 'year',
          tierId: addon.id,
          purpose: 'platform_addon',
        });
        yearlyPriceId = ensured.priceId;
        yearlyUnitAmount = ensured.unitAmount;
        yearlyMatched = ensured.matched;
        createdYearlyPrice = ensured.created;
        if (ensured.previousPriceId && ensured.created) {
          await this.archivePriceQuietly(ensured.previousPriceId);
        }
      }

      const nextMeta: PlanTierStripeMetadata = {
        productId: productId ?? undefined,
        monthlyPriceId: monthlyPriceId ?? undefined,
        yearlyPriceId: yearlyPriceId ?? undefined,
      };

      const displayMonthly =
        monthlyUnitAmount != null
          ? new Prisma.Decimal(monthlyUnitAmount).div(100)
          : undefined;
      const displayYearly =
        yearlyUnitAmount != null
          ? new Prisma.Decimal(yearlyUnitAmount).div(100)
          : undefined;

      await this.prisma.addon.update({
        where: { id: addon.id },
        data: {
          metadata: this.planMapping.mergeTierMetadata(
            addon.metadata,
            nextMeta,
          ) as Prisma.InputJsonValue,
          ...(displayMonthly != null ? { priceMonthly: displayMonthly } : {}),
          ...(displayYearly != null ? { priceYearly: displayYearly } : {}),
        },
      });

      return {
        synced: true,
        stripeConfigured: true,
        productId,
        monthlyPriceId,
        yearlyPriceId,
        monthlyMatched,
        yearlyMatched,
        monthlyUnitAmount,
        yearlyUnitAmount,
        catalogMonthlyCents: monthlyUnitAmount ?? catalogMonthlyCents,
        catalogYearlyCents: yearlyUnitAmount ?? catalogYearlyCents,
        createdMonthlyPrice,
        createdYearlyPrice,
        warnings,
      };
    } catch (error) {
      if (error instanceof AppException) throw error;
      this.stripeApi.logStripeError('addon price sync', error);
      throw new AppException(
        ErrorCode.STRIPE_PRICE_SYNC_FAILED,
        `Failed to sync Stripe prices for add-on: ${
          error instanceof Error ? error.message : String(error)
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async archivePriceQuietly(priceId: string): Promise<void> {
    try {
      await this.stripeApi.getClient().prices.update(priceId, { active: false });
    } catch (error) {
      this.logger.warn(
        `Could not archive old Stripe price ${priceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
