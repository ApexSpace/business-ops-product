import { Injectable } from '@nestjs/common';
import { OfferApplicationMode } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { OfferEvaluationService } from '@app/modules/finance/offers/services/offer-evaluation.service';
import type {
  ApplicableOffer,
  CheckoutContext,
  CheckoutLineItem,
} from '@app/modules/finance/offers/types/offer.types';
import type { CheckoutWithRelations } from '../repositories/checkout.repository';

export type CheckoutOfferMetadata = {
  appliedOffers?: Array<{
    offerId: string;
    offerName: string;
    totalDiscount: number;
    offerCodeUsed?: string;
  }>;
  excludedOfferIds?: string[];
  offerCodeEntered?: string;
  manualOfferIds?: string[];
};

export type CheckoutOffersResult = {
  appliedOffers: ApplicableOffer[];
  totalOfferDiscount: number;
  metadata: CheckoutOfferMetadata;
};

@Injectable()
export class CheckoutOffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offerEvaluation: OfferEvaluationService,
  ) {}

  parseMetadata(raw: unknown): CheckoutOfferMetadata {
    if (!raw || typeof raw !== 'object') return {};
    return raw;
  }

  async evaluateForCheckout(
    businessId: string,
    checkout: CheckoutWithRelations,
    overrides?: Partial<CheckoutOfferMetadata>,
  ): Promise<CheckoutOffersResult> {
    const existing = this.parseMetadata(checkout.metadata);
    const meta: CheckoutOfferMetadata = {
      ...existing,
      ...overrides,
    };

    const lineItems = await this.buildLineItems(businessId, checkout);
    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const staffMemberIds = checkout.items
      .map((item) => item.staffUserId)
      .filter((id): id is string => !!id);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    const timezone = business?.timezone ?? 'UTC';

    const baseContext: CheckoutContext = {
      clientId: checkout.contactId,
      saleDate: new Date(),
      lineItems,
      subtotal,
      staffMemberIds,
      offerCodeEntered: meta.offerCodeEntered,
      excludedOfferIds: meta.excludedOfferIds ?? [],
    };

    const automatic = await this.offerEvaluation.evaluateOffersForCheckout(
      businessId,
      baseContext,
      timezone,
    );

    const manualOffers: ApplicableOffer[] = [];
    for (const manualOfferId of meta.manualOfferIds ?? []) {
      const manual = await this.offerEvaluation.evaluateOffersForCheckout(
        businessId,
        { ...baseContext, manualOfferId },
        timezone,
      );
      manualOffers.push(...manual);
    }

    const merged = this.mergeOffers([...automatic, ...manualOffers]);
    const totalOfferDiscount = merged.reduce(
      (sum, offer) => sum + offer.totalDiscount,
      0,
    );

    const metadata: CheckoutOfferMetadata = {
      ...meta,
      appliedOffers: merged.map((offer) => ({
        offerId: offer.offerId,
        offerName: offer.offerName,
        totalDiscount: offer.totalDiscount,
        offerCodeUsed:
          offer.applicationMode === OfferApplicationMode.OFFER_CODE
            ? meta.offerCodeEntered
            : undefined,
      })),
    };

    return {
      appliedOffers: merged,
      totalOfferDiscount,
      metadata,
    };
  }

  async applyManualOffer(
    businessId: string,
    checkout: CheckoutWithRelations,
    offerId: string,
  ): Promise<CheckoutOffersResult> {
    const existing = this.parseMetadata(checkout.metadata);
    const manualOfferIds = Array.from(
      new Set([...(existing.manualOfferIds ?? []), offerId]),
    );
    return this.evaluateForCheckout(businessId, checkout, { manualOfferIds });
  }

  async removeOffer(
    businessId: string,
    checkout: CheckoutWithRelations,
    offerId: string,
  ): Promise<CheckoutOffersResult> {
    const existing = this.parseMetadata(checkout.metadata);
    const excludedOfferIds = Array.from(
      new Set([...(existing.excludedOfferIds ?? []), offerId]),
    );
    const manualOfferIds = (existing.manualOfferIds ?? []).filter(
      (id) => id !== offerId,
    );
    return this.evaluateForCheckout(businessId, checkout, {
      excludedOfferIds,
      manualOfferIds,
    });
  }

  async recordAppliedOffersOnClose(
    businessId: string,
    checkoutId: string,
    contactId: string,
    metadata: CheckoutOfferMetadata,
  ): Promise<void> {
    for (const offer of metadata.appliedOffers ?? []) {
      await this.offerEvaluation.recordOfferUsage(
        businessId,
        offer.offerId,
        checkoutId,
        contactId,
        offer.offerCodeUsed,
        offer.totalDiscount,
      );
    }
  }

  private mergeOffers(offers: ApplicableOffer[]): ApplicableOffer[] {
    const byId = new Map<string, ApplicableOffer>();
    for (const offer of offers) {
      byId.set(offer.offerId, offer);
    }
    return Array.from(byId.values());
  }

  private async buildLineItems(
    businessId: string,
    checkout: CheckoutWithRelations,
  ): Promise<CheckoutLineItem[]> {
    const serviceIds = checkout.items
      .map((item) => item.serviceId)
      .filter((id): id is string => !!id);
    const productIds = checkout.items
      .map((item) => item.productId)
      .filter((id): id is string => !!id);

    const [services, products] = await Promise.all([
      serviceIds.length
        ? this.prisma.service.findMany({
            where: { businessId, id: { in: serviceIds } },
            select: { id: true, categoryId: true },
          })
        : [],
      productIds.length
        ? this.prisma.product.findMany({
            where: { businessId, id: { in: productIds } },
            select: { id: true, categoryId: true },
          })
        : [],
    ]);

    const serviceCategoryById = new Map(
      services.map((service) => [service.id, service.categoryId]),
    );
    const productCategoryById = new Map(
      products.map((product) => [product.id, product.categoryId]),
    );

    return checkout.items.map((item) => ({
      id: item.id,
      lineType: item.lineType,
      serviceId: item.serviceId,
      productId: item.productId,
      serviceCategoryId: item.serviceId
        ? (serviceCategoryById.get(item.serviceId) ?? null)
        : null,
      productCategoryId: item.productId
        ? (productCategoryById.get(item.productId) ?? null)
        : null,
      unitPrice: Number(item.unitPrice.toString()),
      quantity: Number(item.quantity.toString()),
      totalPrice: Number(item.totalPrice.toString()),
    }));
  }
}
