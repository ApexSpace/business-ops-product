import { Module, forwardRef } from '@nestjs/common';
import { IdempotencyModule } from '@app/core/idempotency/idempotency.module';
import { WebhookEventsModule } from '@app/modules/communications/webhooks/webhook-events.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { StripePlatformBillingController } from './controllers/stripe-platform-billing.controller';
import { StripePlatformApiService } from './services/stripe-platform-api.service';
import { StripePlatformCheckoutService } from './services/stripe-platform-checkout.service';
import { StripePlatformMetadataService } from './services/stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './services/stripe-platform-plan-mapping.service';
import { StripePlatformPortalService } from './services/stripe-platform-portal.service';
import { StripePlatformSubscriptionService } from './services/stripe-platform-subscription.service';
import { StripePlatformWebhookHandlerService } from './services/stripe-platform-webhook-handler.service';
import { StripePlatformWebhookRecoveryService } from './services/stripe-platform-webhook-recovery.service';
import { StripePlatformPaymentMethodService } from './services/stripe-platform-payment-method.service';
import { StripePlatformAddonBillingService } from './services/stripe-platform-addon-billing.service';
import { PlatformBillingDunningService } from './services/platform-billing-dunning.service';
import { StripePlatformTierPriceSyncService } from './services/stripe-platform-tier-price-sync.service';
import { StripeSubscriptionMirrorService } from './services/stripe-subscription-mirror.service';
import { StripePlatformBillingReconcileService } from './services/stripe-platform-billing-reconcile.service';
import { StripePlatformPlanChangeService } from './services/stripe-platform-plan-change.service';

@Module({
  imports: [
    forwardRef(() => BusinessModule),
    IdempotencyModule,
    WebhookEventsModule,
  ],
  controllers: [StripePlatformBillingController],
  providers: [
    StripePlatformApiService,
    StripePlatformPlanMappingService,
    StripePlatformMetadataService,
    StripePlatformCheckoutService,
    StripePlatformPortalService,
    StripePlatformSubscriptionService,
    StripePlatformWebhookHandlerService,
    StripePlatformWebhookRecoveryService,
    StripePlatformPaymentMethodService,
    StripePlatformAddonBillingService,
    PlatformBillingDunningService,
    StripePlatformTierPriceSyncService,
    StripeSubscriptionMirrorService,
    StripePlatformBillingReconcileService,
    StripePlatformPlanChangeService,
  ],
  exports: [
    StripePlatformApiService,
    StripePlatformPlanMappingService,
    StripePlatformMetadataService,
    StripePlatformCheckoutService,
    StripePlatformPortalService,
    StripePlatformSubscriptionService,
    StripePlatformWebhookHandlerService,
    StripePlatformPaymentMethodService,
    StripePlatformAddonBillingService,
    PlatformBillingDunningService,
    StripePlatformTierPriceSyncService,
    StripeSubscriptionMirrorService,
    StripePlatformBillingReconcileService,
    StripePlatformPlanChangeService,
  ],
})
export class StripePlatformBillingModule {}
