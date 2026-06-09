import { Module, forwardRef } from '@nestjs/common';
import { RealtimeModule } from '@app/core/realtime/realtime.module';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { WebhookEventsModule } from '../webhooks/webhook-events.module';
import { ConversationChannelAdapterRegistry } from './adapters/conversation-channel-adapter.registry';
import { FacebookMessengerAdapter } from './adapters/meta/facebook-messenger.adapter';
import { InstagramMessagingAdapter } from './adapters/meta/instagram-messaging.adapter';
import { WhatsAppMessagingAdapter } from './adapters/meta/whatsapp-messaging.adapter';
import { WebchatAdapter } from './adapters/webchat/webchat.adapter';
import { ConversationsController } from './controllers/conversations.controller';
import { ConversationIntegrationRepository } from './repositories/conversation-integration.repository';
import { ConversationMessagesRepository } from './repositories/conversation-messages.repository';
import { ConversationsRepository } from './repositories/conversations.repository';
import { ConversationAssignmentService } from './services/conversation-assignment.service';
import { ConversationContactResolverService } from './services/conversation-contact-resolver.service';
import { ConversationMessagesService } from './services/conversation-messages.service';
import { ConversationRealtimeService } from './services/conversation-realtime.service';
import { ConversationWebhookIngestionService } from './services/conversation-webhook-ingestion.service';
import { ConversationsService } from './services/conversations.service';

@Module({
  imports: [
    AuditModule,
    BusinessModule,
    ContactsModule,
    WebhookEventsModule,
    RealtimeModule,
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsRepository,
    ConversationMessagesRepository,
    ConversationIntegrationRepository,
    ConversationsService,
    ConversationMessagesService,
    ConversationContactResolverService,
    ConversationAssignmentService,
    ConversationRealtimeService,
    ConversationWebhookIngestionService,
    FacebookMessengerAdapter,
    InstagramMessagingAdapter,
    WhatsAppMessagingAdapter,
    WebchatAdapter,
    ConversationChannelAdapterRegistry,
  ],
  exports: [
    ConversationWebhookIngestionService,
    ConversationsService,
    WebhookEventsModule,
    ConversationMessagesRepository,
    ConversationsRepository,
    ConversationChannelAdapterRegistry,
    ConversationRealtimeService,
  ],
})
export class ConversationsModule {}
