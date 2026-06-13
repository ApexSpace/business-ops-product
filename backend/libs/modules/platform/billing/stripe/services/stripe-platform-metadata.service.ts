import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BusinessSubscriptionStripeMetadata } from '../types/stripe-platform-billing.types';

@Injectable()
export class StripePlatformMetadataService {
  parseSubscriptionStripeMetadata(
    metadata: unknown,
  ): BusinessSubscriptionStripeMetadata | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    const root = metadata as Record<string, unknown>;
    const stripe =
      root.stripe && typeof root.stripe === 'object' && !Array.isArray(root.stripe)
        ? (root.stripe as Record<string, unknown>)
        : null;
    if (!stripe) return null;

    return {
      customerId:
        typeof stripe.customerId === 'string' ? stripe.customerId : undefined,
      subscriptionId:
        typeof stripe.subscriptionId === 'string'
          ? stripe.subscriptionId
          : undefined,
      subscriptionItemId:
        typeof stripe.subscriptionItemId === 'string'
          ? stripe.subscriptionItemId
          : undefined,
      priceId: typeof stripe.priceId === 'string' ? stripe.priceId : undefined,
      productId:
        typeof stripe.productId === 'string' ? stripe.productId : undefined,
      status: typeof stripe.status === 'string' ? stripe.status : undefined,
      cancelAtPeriodEnd:
        typeof stripe.cancelAtPeriodEnd === 'boolean'
          ? stripe.cancelAtPeriodEnd
          : undefined,
      cancelAt:
        stripe.cancelAt === null || typeof stripe.cancelAt === 'string'
          ? stripe.cancelAt
          : undefined,
      canceledAt:
        stripe.canceledAt === null || typeof stripe.canceledAt === 'string'
          ? stripe.canceledAt
          : undefined,
      latestInvoiceId:
        stripe.latestInvoiceId === null ||
        typeof stripe.latestInvoiceId === 'string'
          ? stripe.latestInvoiceId
          : undefined,
      lastSyncedAt:
        typeof stripe.lastSyncedAt === 'string'
          ? stripe.lastSyncedAt
          : undefined,
    };
  }

  mergeSubscriptionStripeMetadata(
    existing: unknown,
    patch: BusinessSubscriptionStripeMetadata,
  ): Prisma.InputJsonValue {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    const current = this.parseSubscriptionStripeMetadata(base) ?? {};
    return {
      ...base,
      stripe: {
        ...current,
        ...patch,
        lastSyncedAt: new Date().toISOString(),
      },
    };
  }
}
