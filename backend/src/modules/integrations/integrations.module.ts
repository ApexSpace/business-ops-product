import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { BusinessIntegrationResourcesController } from './business-integration-resources.controller';
import { BusinessIntegrationsController } from './business-integrations.controller';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleOAuthService } from './google-oauth.service';
import { IntegrationProvidersController } from './integration-providers.controller';
import { IntegrationsService } from './integrations.service';
import { LinkedInOAuthController } from './linkedin-oauth.controller';
import { LinkedInOAuthService } from './linkedin-oauth.service';
import { StripeOAuthController } from './stripe/controllers/stripe-oauth.controller';
import { StripeWebhookController } from './stripe/controllers/stripe-webhook.controller';
import { StripeAccountService } from './stripe/services/stripe-account.service';
import { StripeApiService } from './stripe/services/stripe-api.service';
import { StripeCheckoutService } from './stripe/services/stripe-checkout.service';
import { StripeOAuthService } from './stripe/services/stripe-oauth.service';
import { StripeWebhookService } from './stripe/services/stripe-webhook.service';
import { MetaOAuthController } from './meta/controllers/meta-oauth.controller';
import { MetaWebhookController } from './meta/controllers/meta-webhook.controller';
import { MetaApiClient } from './meta/services/meta-api-client';
import { MetaConfigService } from './meta/services/meta-config.service';
import { MetaEmbeddedSignupService } from './meta/services/meta-embedded-signup.service';
import { MetaOAuthCallbackRouter } from './meta/services/meta-oauth-callback.router';
import { MetaOAuthService } from './meta/services/meta-oauth.service';
import { MetaResourceSyncService } from './meta/services/meta-resource-sync.service';
import { MetaTokenService } from './meta/services/meta-token.service';
import { MetaWebhookService } from './meta/services/meta-webhook.service';
import { PlatformIntegrationsController } from './platform-integrations.controller';
import { FacebookResourceSyncHandler } from './providers/resource-sync/facebook-resource-sync.handler';
import { GoogleBusinessProfileResourceSyncHandler } from './providers/resource-sync/google-business-profile-resource-sync.handler';
import { GoogleCalendarResourceSyncHandler } from './providers/resource-sync/google-calendar-resource-sync.handler';
import { InstagramResourceSyncHandler } from './providers/resource-sync/instagram-resource-sync.handler';
import { IntegrationResourceSyncRegistry } from './providers/resource-sync/integration-resource-sync.registry';
import { StripeResourceSyncHandler } from './providers/resource-sync/stripe-resource-sync.handler';
import { WhatsAppResourceSyncHandler } from './providers/resource-sync/whatsapp-resource-sync.handler';
import { BusinessIntegrationRepository } from './repositories/business-integration.repository';
import { IntegrationProviderRepository } from './repositories/integration-provider.repository';
import { IntegrationResourceRepository } from './repositories/integration-resource.repository';
import { PlatformIntegrationRepository } from './repositories/platform-integration.repository';
import { GoogleTokenService } from './services/google-token.service';
import { IntegrationResourcesService } from './services/integration-resources.service';
import { MessagingStatusService } from './services/messaging-status.service';

@Module({
  imports: [AuditModule, forwardRef(() => ConversationsModule)],
  controllers: [
    IntegrationProvidersController,
    BusinessIntegrationsController,
    BusinessIntegrationResourcesController,
    PlatformIntegrationsController,
    GoogleOAuthController,
    LinkedInOAuthController,
    StripeOAuthController,
    StripeWebhookController,
    MetaOAuthController,
    MetaWebhookController,
  ],
  providers: [
    IntegrationProviderRepository,
    BusinessIntegrationRepository,
    IntegrationResourceRepository,
    PlatformIntegrationRepository,
    IntegrationsService,
    GoogleOAuthService,
    LinkedInOAuthService,
    StripeApiService,
    StripeAccountService,
    StripeOAuthService,
    StripeWebhookService,
    StripeCheckoutService,
    GoogleTokenService,
    IntegrationResourcesService,
    GoogleCalendarResourceSyncHandler,
    GoogleBusinessProfileResourceSyncHandler,
    FacebookResourceSyncHandler,
    InstagramResourceSyncHandler,
    WhatsAppResourceSyncHandler,
    StripeResourceSyncHandler,
    IntegrationResourceSyncRegistry,
    MetaConfigService,
    MetaApiClient,
    MetaTokenService,
    MetaOAuthService,
    MetaOAuthCallbackRouter,
    MetaEmbeddedSignupService,
    MetaResourceSyncService,
    MetaWebhookService,
    MessagingStatusService,
  ],
  exports: [
    IntegrationsService,
    IntegrationResourcesService,
    GoogleTokenService,
    MetaTokenService,
    MetaConfigService,
    StripeApiService,
    StripeAccountService,
    StripeCheckoutService,
    BusinessIntegrationRepository,
    IntegrationResourceRepository,
    MessagingStatusService,
    MetaApiClient,
  ],
})
export class IntegrationsModule {}
