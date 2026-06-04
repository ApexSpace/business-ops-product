import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { ConversationChannelAdapterRegistry } from './adapters/conversation-channel-adapter.registry';
import { FacebookMessengerAdapter } from './adapters/meta/facebook-messenger.adapter';
import { InstagramMessagingAdapter } from './adapters/meta/instagram-messaging.adapter';
import { ConversationsController } from './controllers/conversations.controller';
import { ConversationIntegrationRepository } from './repositories/conversation-integration.repository';
import { ConversationMessagesRepository } from './repositories/conversation-messages.repository';
import { ConversationsRepository } from './repositories/conversations.repository';
import { WebhookEventsRepository } from './repositories/webhook-events.repository';
import { ConversationAssignmentService } from './services/conversation-assignment.service';
import { ConversationContactResolverService } from './services/conversation-contact-resolver.service';
import { ConversationMessagesService } from './services/conversation-messages.service';
import { ConversationWebhookIngestionService } from './services/conversation-webhook-ingestion.service';
import { ConversationsService } from './services/conversations.service';

@Module({
  imports: [
    AuditModule,
    ContactsModule,
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsRepository,
    ConversationMessagesRepository,
    ConversationIntegrationRepository,
    WebhookEventsRepository,
    ConversationsService,
    ConversationMessagesService,
    ConversationContactResolverService,
    ConversationAssignmentService,
    ConversationWebhookIngestionService,
    FacebookMessengerAdapter,
    InstagramMessagingAdapter,
    ConversationChannelAdapterRegistry,
  ],
  exports: [
    ConversationWebhookIngestionService,
    ConversationsService,
    WebhookEventsRepository,
    ConversationMessagesRepository,
    ConversationsRepository,
    ConversationChannelAdapterRegistry,
  ],
})
export class ConversationsModule {}
