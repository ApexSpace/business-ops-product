import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionBillingSource } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripeSubscriptionMirrorService } from './stripe-subscription-mirror.service';
import type { StripeSubscriptionObject } from '../types/stripe-platform-billing.types';

/**
 * Nightly safety net: pull Stripe subscriptions and re-apply the webhook mirror.
 */
@Injectable()
export class StripePlatformBillingReconcileService {
  private readonly logger = new Logger(
    StripePlatformBillingReconcileService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly mirror: StripeSubscriptionMirrorService,
    private readonly metadataService: StripePlatformMetadataService,
  ) {}

  async reconcileAll(opts?: {
    limit?: number;
  }): Promise<{ checked: number; corrected: number; errors: number }> {
    if (!this.stripeApi.isConfigured()) {
      this.logger.warn('Stripe not configured; skip billing reconcile');
      return { checked: 0, corrected: 0, errors: 0 };
    }

    const limit = opts?.limit ?? 200;
    const rows = await this.prisma.businessSubscription.findMany({
      where: { billingSource: SubscriptionBillingSource.STRIPE },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });

    let checked = 0;
    let corrected = 0;
    let errors = 0;
    const stripe = this.stripeApi.getClient();

    for (const row of rows) {
      const subId = this.resolveStripeSubscriptionId(row);
      if (!subId) continue;
      checked += 1;
      try {
        const remote = await stripe.subscriptions.retrieve(subId, {
          expand: ['items.data.price'],
        });
        const beforeStatus = row.status;
        const beforePrice = row.stripePriceId;
        const beforeCancel = row.cancelAtPeriodEnd;
        await this.mirror.applyFromStripeSubscription(
          remote as unknown as StripeSubscriptionObject,
          { syncCapabilities: true },
        );
        const after = await this.prisma.businessSubscription.findUnique({
          where: { businessId: row.businessId },
        });
        if (
          after &&
          (after.status !== beforeStatus ||
            after.stripePriceId !== beforePrice ||
            after.cancelAtPeriodEnd !== beforeCancel)
        ) {
          corrected += 1;
        }
      } catch (error) {
        errors += 1;
        this.logger.warn(
          `Reconcile failed for ${row.businessId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `Billing reconcile checked=${checked} corrected=${corrected} errors=${errors}`,
    );
    return { checked, corrected, errors };
  }

  private resolveStripeSubscriptionId(row: {
    stripeSubscriptionId: string | null;
    metadata: unknown;
  }): string | null {
    if (row.stripeSubscriptionId) return row.stripeSubscriptionId;
    const meta = this.metadataService.parseSubscriptionStripeMetadata(
      row.metadata,
    );
    return meta?.subscriptionId ?? null;
  }
}
