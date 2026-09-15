import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

/**
 * PAST_DUE dunning seam — logs / schedules reminder work.
 * Full email templates + BullMQ worker can extend this without changing call sites.
 */
@Injectable()
export class PlatformBillingDunningService {
  private readonly logger = new Logger(PlatformBillingDunningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onPaymentFailed(businessId: string, invoiceId?: string | null) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { id: true, name: true, email: true },
    });
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      select: { status: true, currentPeriodEnd: true },
    });

    this.logger.warn(
      JSON.stringify({
        event: 'platform_billing.dunning.payment_failed',
        businessId,
        businessName: business?.name,
        email: business?.email,
        invoiceId: invoiceId ?? null,
        subscriptionStatus: subscription?.status ?? null,
        graceHint:
          subscription?.status === SubscriptionStatus.PAST_DUE
            ? 'Workspace remains accessible during grace; suspend after policy window'
            : null,
      }),
    );

    // Seam for JobEnqueueService → dunning email worker
    return {
      businessId,
      queued: false,
      notice: 'Dunning logged; email worker not yet wired',
    };
  }

  async onCardUpdatedDuringPastDue(businessId: string) {
    this.logger.log(
      `Card updated during PAST_DUE for business ${businessId}; Stripe will retry open invoices`,
    );
  }
}
