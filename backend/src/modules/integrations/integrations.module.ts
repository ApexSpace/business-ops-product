import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessIntegrationResourcesController } from './business-integration-resources.controller';
import { BusinessIntegrationsController } from './business-integrations.controller';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleOAuthService } from './google-oauth.service';
import { IntegrationProvidersController } from './integration-providers.controller';
import { IntegrationsService } from './integrations.service';
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
import { WhatsAppResourceSyncHandler } from './providers/resource-sync/whatsapp-resource-sync.handler';
import { BusinessIntegrationRepository } from './repositories/business-integration.repository';
import { IntegrationProviderRepository } from './repositories/integration-provider.repository';
import { IntegrationResourceRepository } from './repositories/integration-resource.repository';
import { PlatformIntegrationRepository } from './repositories/platform-integration.repository';
import { GoogleTokenService } from './services/google-token.service';
import { IntegrationResourcesService } from './services/integration-resources.service';

@Module({
  imports: [AuditModule],
  controllers: [
    IntegrationProvidersController,
    BusinessIntegrationsController,
    BusinessIntegrationResourcesController,
    PlatformIntegrationsController,
    GoogleOAuthController,
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
    GoogleTokenService,
    IntegrationResourcesService,
    GoogleCalendarResourceSyncHandler,
    GoogleBusinessProfileResourceSyncHandler,
    FacebookResourceSyncHandler,
    InstagramResourceSyncHandler,
    WhatsAppResourceSyncHandler,
    IntegrationResourceSyncRegistry,
    MetaConfigService,
    MetaApiClient,
    MetaTokenService,
    MetaOAuthService,
    MetaOAuthCallbackRouter,
    MetaEmbeddedSignupService,
    MetaResourceSyncService,
    MetaWebhookService,
  ],
  exports: [
    IntegrationsService,
    IntegrationResourcesService,
    GoogleTokenService,
    MetaTokenService,
    MetaConfigService,
    BusinessIntegrationRepository,
    IntegrationResourceRepository,
  ],
})
export class IntegrationsModule {}
