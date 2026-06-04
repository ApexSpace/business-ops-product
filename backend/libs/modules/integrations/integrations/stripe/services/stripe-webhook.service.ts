import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  IntegrationStatus,
  Prisma,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import type { ProcessStripeWebhookPayload } from '@app/core/queue/queue.types';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import type {
  StripeConnectAccount,
  StripeWebhookEvent,
  StripeWebhookMetadata,
} from '../stripe.types';
import { StripeAccountService } from './stripe-account.service';
import { StripeApiService } from './stripe-api.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly stripeApiService: StripeApiService,
    private readonly stripeAccountService: StripeAccountService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly auditService: AuditService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly jobEnqueue: JobEnqueueService,
  ) {}

  async handlePlatformWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<void> {
    const event = this.verifyAndParse(rawBody, signature, 'platform');
    await this.persistAndEnqueue(event, 'platform');
  }

  async handleConnectedAccountWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<void> {
    const event = this.verifyAndParse(rawBody, signature, 'connected');
    await this.persistAndEnqueue(event, 'connected');
  }

  async processQueuedEvent(payload: ProcessStripeWebhookPayload): Promise<void> {
    const record = await this.webhookEventsRepository.findById(
      payload.webhookEventId,
    );
    if (!record?.payload) {
      this.logger.warn(`Stripe webhook event ${payload.webhookEventId} missing`);
      return;
    }
    const event = record.payload as unknown as StripeWebhookEvent;
    await this.dispatchEvent(event, payload.source);
  }

  private verifyAndParse(
    rawBody: Buffer,
    signature: string | undefined,
    source: 'platform' | 'connected',
  ): StripeWebhookEvent {
    const secret =
      source === 'platform'
        ? this.stripeApiService.getPlatformWebhookSecret()
        : this.stripeApiService.getConnectedAccountWebhookSecret();

    if (!secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe webhook secret is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!signature) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Missing Stripe signature header',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.stripeApiService.constructWebhookEvent(
      rawBody,
      signature,
      secret,
    );
  }

  private async persistAndEnqueue(
    event: StripeWebhookEvent,
    source: 'platform' | 'connected',
  ): Promise<void> {
    const existing = await this.webhookEventsRepository.findByProviderAndExternalId(
      WebhookEventProvider.STRIPE,
      event.id,
    );
    if (existing?.status === WebhookEventStatus.PROCESSED) {
      return;
    }

    const webhookEvent = await this.webhookEventsRepository.create({
      provider: WebhookEventProvider.STRIPE,
      externalEventId: event.id,
      eventType: event.type,
      payload: event as unknown as Prisma.InputJsonValue,
      status: WebhookEventStatus.RECEIVED,
    });

    await this.jobEnqueue.enqueueStripeWebhook({
      webhookEventId: webhookEvent.id,
      source,
    });
  }

  private async dispatchEvent(
    event: StripeWebhookEvent,
    source: 'platform' | 'connected',
  ): Promise<void> {
    this.logger.log(`Stripe webhook [${source}]: ${event.type} (${event.id})`);

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      action: 'stripe.webhook.received',
      entityType: 'StripeWebhook',
      entityId: event.id,
      metadata: { type: event.type, source, livemode: event.livemode },
    });

    switch (event.type) {
      case 'account.updated':
        await this.handleAccountUpdated(event);
        break;
      case 'account.application.authorized':
        await this.handleAccountAuthorized(event);
        break;
      case 'account.application.deauthorized':
        await this.handleAccountDeauthorized(event);
        break;
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async handleAccountUpdated(event: StripeWebhookEvent): Promise<void> {
    const account = event.data.object as unknown as StripeConnectAccount;
    const integration =
      await this.stripeAccountService.findIntegrationByStripeAccountId(account.id);
    if (!integration) return;

    const config = integration.config as Record<string, unknown> | null;
    const livemode =
      typeof config?.livemode === 'boolean' ? config.livemode : false;

    await this.stripeAccountService.persistAccountSnapshot(
      integration.id,
      integration.businessId,
      account,
      livemode,
    );
  }

  private async handleAccountAuthorized(event: StripeWebhookEvent): Promise<void> {
    const application = event.data.object as { account?: string };
    const accountId = application.account;
    if (!accountId) return;
    const integration =
      await this.stripeAccountService.findIntegrationByStripeAccountId(accountId);
    if (!integration) return;

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: integration.businessId,
      action: 'stripe.connected',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: { stripeAccountId: accountId, via: 'webhook' },
    });
  }

  private async handleAccountDeauthorized(event: StripeWebhookEvent): Promise<void> {
    const application = event.data.object as { account?: string };
    const accountId = application.account;
    if (!accountId) return;

    const integration =
      await this.stripeAccountService.findIntegrationByStripeAccountId(accountId);
    if (!integration) return;

    await this.businessIntegrationRepository.update(
      integration.businessId,
      'stripe',
      {
        status: IntegrationStatus.EXPIRED,
        errorMessage: 'Stripe disconnected. Reconnect to accept payments again.',
      },
    );
  }

  private async handleCheckoutSessionCompleted(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const session = event.data.object as { metadata?: StripeWebhookMetadata };
    await this.logPaymentMetadata(event, session.metadata ?? null, 'payment.succeeded');
  }

  private async handlePaymentIntentSucceeded(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const intent = event.data.object as { metadata?: StripeWebhookMetadata };
    await this.logPaymentMetadata(event, intent.metadata ?? null, 'payment.succeeded');
  }

  private async handlePaymentIntentFailed(event: StripeWebhookEvent): Promise<void> {
    const intent = event.data.object as { metadata?: StripeWebhookMetadata };
    await this.logPaymentMetadata(event, intent.metadata ?? null, 'payment.failed');
  }

  private async handleChargeRefunded(event: StripeWebhookEvent): Promise<void> {
    const charge = event.data.object as { metadata?: StripeWebhookMetadata };
    await this.logPaymentMetadata(event, charge.metadata ?? null, 'refund.created');
  }

  private async logPaymentMetadata(
    event: StripeWebhookEvent,
    metadata: StripeWebhookMetadata,
    actionSuffix: string,
  ): Promise<void> {
    const businessId = metadata?.businessId;
    if (!businessId) return;

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId,
      action: `stripe.${actionSuffix}`,
      entityType: metadata?.invoiceId ? 'Invoice' : 'Payment',
      entityId: metadata?.invoiceId ?? event.id,
      metadata: { eventId: event.id, eventType: event.type },
    });
  }
}
