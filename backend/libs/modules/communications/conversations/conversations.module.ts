import { Module, forwardRef } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { OutboundMessageDispatchService } from '../messages/services/outbound-message-dispatch.service';
import { OutboundMessageRecoveryService } from '../messages/services/outbound-message-recovery.service';
import { SendMessageProcessorModule } from '../messages/send-message-processor.module';
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
import { EmailMessagingAdapter } from './adapters/email/email-messaging.adapter';
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
import { EmailConversationsService } from './services/email-conversations.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    ContactsModule,
    RealtimeModule,
    WebhookEventsModule,
    forwardRef(() => EmailModule),
    forwardRef(() => IntegrationsModule),
    forwardRef(() => SendMessageProcessorModule),
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
    EmailConversationsService,
    EmailMessagingAdapter,
    FacebookMessengerAdapter,
    InstagramMessagingAdapter,
    WhatsAppMessagingAdapter,
    WebchatAdapter,
    ConversationChannelAdapterRegistry,
    OutboundMessageDispatchService,
    OutboundMessageRecoveryService,
  ],
  exports: [
    ConversationWebhookIngestionService,
    ConversationRealtimeService,
    ConversationsService,
    WebhookEventsModule,
    ConversationMessagesRepository,
    ConversationsRepository,
    ConversationChannelAdapterRegistry,
    ConversationRealtimeService,
  ],
})
export class ConversationsModule {}
