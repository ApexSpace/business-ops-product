import { Injectable, Logger } from '@nestjs/common';
import { RedisPubSubService } from '@app/core/realtime/redis-pub-sub.service';

export const PAYMENT_REALTIME_EVENTS = {
  paymentCollected: 'payment.collected',
  checkoutClosed: 'checkout.closed',
} as const;

export interface PaymentCollectedPayload {
  paymentId?: string;
  payableType: string;
  payableId: string;
  invoiceId?: string;
  contactId?: string;
}

export interface CheckoutClosedPayload {
  checkoutId: string;
  contactId?: string;
}

@Injectable()
export class PaymentRealtimeService {
  private readonly logger = new Logger(PaymentRealtimeService.name);

  constructor(private readonly pubSub: RedisPubSubService) {}

  async publishPaymentCollected(
    businessId: string,
    payload: PaymentCollectedPayload,
  ): Promise<void> {
    await this.publish(
      businessId,
      PAYMENT_REALTIME_EVENTS.paymentCollected,
      payload,
    );
  }

  async publishCheckoutClosed(
    businessId: string,
    payload: CheckoutClosedPayload,
  ): Promise<void> {
    await this.publish(
      businessId,
      PAYMENT_REALTIME_EVENTS.checkoutClosed,
      payload,
    );
  }

  private async publish(
    businessId: string,
    event: string,
    payload: PaymentCollectedPayload | CheckoutClosedPayload,
  ): Promise<void> {
    if (!this.pubSub.isAvailable()) {
      return;
    }

    try {
      await this.pubSub.publish(businessId, event, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to publish ${event} for ${businessId}: ${message}`,
      );
    }
  }
}
