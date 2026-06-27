import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ClientMembershipStatus,
  DiscountAmountType,
  DiscountAppliesTo,
  DiscountScope,
  InvoiceLineType,
  OfferApplicationMode,
  OfferMembershipScope,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { OfferDetailRow } from '../repositories/offer.repository';
import { OfferRepository } from '../repositories/offer.repository';
import { OfferCacheService } from './offer-cache.service';
import type {
  ApplicableOffer,
  CheckoutContext,
  DiscountBreakdown,
  LineItemDiscount,
  OfferDateRule,
} from '../types/offer.types';
import {
  matchesOfferDateRules,
  parseOfferDateRules,
} from '../utils/offer-date-rules.util';

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

@Injectable()
export class OfferEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offerRepository: OfferRepository,
    private readonly offerCache: OfferCacheService,
  ) {}

  async evaluateOffersForCheckout(
    businessId: string,
    context: CheckoutContext,
    timezone = 'UTC',
  ): Promise<ApplicableOffer[]> {
    const offers = await this.offerCache.getEnabledOffers(businessId);
    const applicable: ApplicableOffer[] = [];

    for (const offer of offers) {
      if (context.excludedOfferIds?.includes(offer.id)) continue;

      const passes = await this.isOfferEligible(
        businessId,
        offer,
        context,
        timezone,
      );
      if (!passes) continue;

      const breakdown = this.calculateDiscounts(offer, context);
      if (breakdown.totalDiscount <= 0) continue;

      applicable.push({
        offerId: offer.id,
        offerName: offer.name,
        applicationMode: offer.applicationMode,
        commissionBasis: offer.commissionBasis,
        totalDiscount: breakdown.totalDiscount,
        discounts: breakdown.discounts,
      });
    }

    return applicable;
  }

  async validateOfferCode(businessId: string, code: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;
    return this.offerRepository.findByOfferCode(businessId, normalized);
  }

  async recordOfferUsage(
    businessId: string,
    offerId: string,
    saleId: string,
    contactId?: string,
    codeUsed?: string,
    discountAmount?: number,
  ): Promise<void> {
    await this.offerRepository.createUsageLog({
      businessId,
      offerId,
      saleId,
      contactId,
      offerCodeUsed: codeUsed?.toUpperCase(),
      discountAmount,
    });
  }

  private async isOfferEligible(
    businessId: string,
    offer: OfferDetailRow,
    context: CheckoutContext,
    timezone: string,
  ): Promise<boolean> {
    if (!offer.discounts.length) return false;

    if (!(await this.passesApplicationMode(offer, context))) return false;
    if (!(await this.passesAutomaticConditions(offer, context, timezone))) {
      return false;
    }
    if (!(await this.passesRestrictions(businessId, offer, context))) {
      return false;
    }

    return true;
  }

  private async passesApplicationMode(
    offer: OfferDetailRow,
    context: CheckoutContext,
  ): Promise<boolean> {
    switch (offer.applicationMode) {
      case OfferApplicationMode.STAFF_ONLY:
        return context.manualOfferId === offer.id;
      case OfferApplicationMode.OFFER_CODE:
        if (!context.offerCodeEntered || !offer.offerCode) return false;
        return (
          context.offerCodeEntered.trim().toUpperCase() === offer.offerCode
        );
      case OfferApplicationMode.AUTOMATICALLY:
        return true;
      default:
        return false;
    }
  }

  private async passesAutomaticConditions(
    offer: OfferDetailRow,
    context: CheckoutContext,
    timezone: string,
  ): Promise<boolean> {
    if (offer.applicationMode !== OfferApplicationMode.AUTOMATICALLY) {
      return true;
    }

    const enabledConditions = [
      offer.autoApptDateEnabled,
      offer.autoBookingDateEnabled,
      offer.autoSaleDateEnabled,
    ].filter(Boolean).length;

    if (enabledConditions === 0) return false;

    if (offer.autoApptDateEnabled) {
      if (!context.appointmentDateTime) return false;
      const rules = parseOfferDateRules(offer.autoApptDateRules);
      if (!matchesOfferDateRules(context.appointmentDateTime, rules, timezone)) {
        return false;
      }
    }

    if (offer.autoBookingDateEnabled) {
      if (!context.bookingDate) return false;
      const rules = parseOfferDateRules(offer.autoBookingDateRules);
      if (!matchesOfferDateRules(context.bookingDate, rules, timezone)) {
        return false;
      }
    }

    if (offer.autoSaleDateEnabled) {
      const rules = parseOfferDateRules(offer.autoSaleDateRules);
      if (!matchesOfferDateRules(context.saleDate, rules, timezone)) {
        return false;
      }
    }

    return true;
  }

  private async passesRestrictions(
    businessId: string,
    offer: OfferDetailRow,
    context: CheckoutContext,
  ): Promise<boolean> {
    if (offer.minAmountEnabled) {
      const min = Number(offer.minAmount?.toString() ?? 0);
      if (context.subtotal < min) return false;
    }

    if (context.clientId) {
      if (offer.oncePerClient) {
        const uses = await this.offerRepository.findUsageCountByContact(
          offer.id,
          context.clientId,
        );
        if (uses > 0) return false;
      }

      if (offer.newClientsOnly) {
        const sales = await this.offerRepository.countCompletedSalesForContact(
          businessId,
          context.clientId,
        );
        if (sales > 0) return false;
      }

      if (offer.membershipRequired) {
        const active = await this.prisma.clientMembership.findMany({
          where: {
            businessId,
            contactId: context.clientId,
            status: ClientMembershipStatus.ACTIVE,
          },
          select: { planId: true },
        });
        if (active.length === 0) return false;

        if (offer.membershipScope === OfferMembershipScope.SPECIFIC) {
          const planIds = parseStringArray(offer.specificMembershipPlanIds);
          if (
            !active.some((membership) => planIds.includes(membership.planId))
          ) {
            return false;
          }
        }
      }
    } else if (
      offer.oncePerClient ||
      offer.newClientsOnly ||
      offer.membershipRequired
    ) {
      return false;
    }

    if (offer.specificProvidersEnabled) {
      const providerIds = parseStringArray(offer.specificProviderIds);
      if (providerIds.length === 0) return false;
      const hasMatch = context.staffMemberIds.some((id) =>
        providerIds.includes(id),
      );
      if (!hasMatch) return false;
    }

    return true;
  }

  private calculateDiscounts(
    offer: OfferDetailRow,
    context: CheckoutContext,
  ): { totalDiscount: number; discounts: DiscountBreakdown[] } {
    const breakdowns: DiscountBreakdown[] = [];
    let totalDiscount = 0;

    for (const discount of offer.discounts) {
      const breakdown = this.calculateSingleDiscount(discount, context);
      if (breakdown.lineDiscounts.length || breakdown.entireSaleDiscount) {
        breakdowns.push(breakdown);
        totalDiscount +=
          breakdown.entireSaleDiscount ??
          breakdown.lineDiscounts.reduce((sum, line) => sum + line.discountAmount, 0);
      }
    }

    return { totalDiscount: roundMoney(totalDiscount), discounts: breakdowns };
  }

  private calculateSingleDiscount(
    discount: OfferDetailRow['discounts'][number],
    context: CheckoutContext,
  ): DiscountBreakdown {
    const amount = Number(discount.amount.toString());
    const breakdown: DiscountBreakdown = {
      discountId: discount.id,
      appliesTo: discount.appliesTo,
      amountType: discount.amountType,
      amount,
      lineDiscounts: [],
    };

    if (discount.appliesTo === DiscountAppliesTo.ENTIRE_SALE) {
      breakdown.entireSaleDiscount = roundMoney(amount);
      return breakdown;
    }

    const qualifyingItems = context.lineItems.filter((item) =>
      this.itemQualifies(discount, item),
    );

    for (const item of qualifyingItems) {
      const lineTotal = item.totalPrice;
      let discountAmount = 0;

      if (discount.amountType === DiscountAmountType.PERCENTAGE) {
        discountAmount = roundMoney(lineTotal * (amount / 100));
      } else {
        discountAmount = roundMoney(Math.min(amount * item.quantity, lineTotal));
      }

      if (discountAmount <= 0) continue;

      const discountedTotal = roundMoney(lineTotal - discountAmount);
      breakdown.lineDiscounts.push({
        lineItemId: item.id,
        serviceId: item.serviceId,
        productId: item.productId,
        discountAmount,
        originalUnitPrice: item.unitPrice,
        discountedUnitPrice: roundMoney(discountedTotal / item.quantity),
      });
    }

    return breakdown;
  }

  private itemQualifies(
    discount: OfferDetailRow['discounts'][number],
    item: CheckoutContext['lineItems'][number],
  ): boolean {
    if (discount.appliesTo === DiscountAppliesTo.SERVICES) {
      if (item.lineType !== InvoiceLineType.SERVICE && !item.serviceId) {
        return false;
      }
      if (discount.serviceScope === DiscountScope.ALL) return true;
      const categoryIds = parseStringArray(discount.specificServiceCategoryIds);
      const serviceIds = parseStringArray(discount.specificServiceIds);
      if (item.serviceId && serviceIds.includes(item.serviceId)) return true;
      if (
        item.serviceCategoryId &&
        categoryIds.includes(item.serviceCategoryId)
      ) {
        return true;
      }
      return false;
    }

    if (discount.appliesTo === DiscountAppliesTo.PRODUCTS) {
      if (item.lineType !== InvoiceLineType.PRODUCT && !item.productId) {
        return false;
      }
      if (discount.productScope === DiscountScope.ALL) return true;
      const categoryIds = parseStringArray(discount.specificProductCategoryIds);
      const productIds = parseStringArray(discount.specificProductIds);
      if (item.productId && productIds.includes(item.productId)) return true;
      if (
        item.productCategoryId &&
        categoryIds.includes(item.productCategoryId)
      ) {
        return true;
      }
      return false;
    }

    return false;
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
