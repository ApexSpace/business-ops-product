import { Module } from '@nestjs/common';
import { BusinessIntegrationRepository } from '../integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../integrations/repositories/integration-resource.repository';
import { MetaApiClient } from '../integrations/meta/services/meta-api-client';
import { MetaConfigService } from '../integrations/meta/services/meta-config.service';
import { MetaTokenService } from '../integrations/meta/services/meta-token.service';
import { WhatsAppTemplateRepository } from './repositories/whatsapp-template.repository';
import { WhatsAppBusinessContextService } from './services/whatsapp-business-context.service';
import { WhatsAppMetaUploadService } from './services/whatsapp-meta-upload.service';
import { WhatsAppTemplateService } from './services/whatsapp-template.service';
import { WhatsAppTemplateWebhookService } from './services/whatsapp-template-webhook.service';

@Module({
  providers: [
    WhatsAppTemplateRepository,
    WhatsAppBusinessContextService,
    WhatsAppTemplateService,
    WhatsAppMetaUploadService,
    WhatsAppTemplateWebhookService,
    BusinessIntegrationRepository,
    IntegrationResourceRepository,
    MetaTokenService,
    MetaApiClient,
    MetaConfigService,
  ],
  exports: [
    WhatsAppTemplateService,
    WhatsAppTemplateWebhookService,
    WhatsAppTemplateRepository,
    WhatsAppBusinessContextService,
  ],
})
export class WhatsAppModule {}
