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
  ],
  exports: [
    StripePlatformApiService,
    StripePlatformPlanMappingService,
    StripePlatformMetadataService,
    StripePlatformCheckoutService,
    StripePlatformPortalService,
    StripePlatformSubscriptionService,
    StripePlatformWebhookHandlerService,
  ],
})
export class StripePlatformBillingModule {}
