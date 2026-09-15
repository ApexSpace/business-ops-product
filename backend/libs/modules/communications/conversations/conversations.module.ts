import { Module, forwardRef } from '@nestjs/common';
import { IdempotencyModule } from '@app/core/idempotency/idempotency.module';
import { EmailModule } from '../email/email.module';
import { OutboundMessageDispatchService } from '../messages/services/outbound-message-dispatch.service';
import { OutboundMessageRecoveryService } from '../messages/services/outbound-message-recovery.service';
import { SendMessageProcessorModule } from '../messages/send-message-processor.module';
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
import { SmsMessagingAdapter } from './adapters/sms/sms-messaging.adapter';
import { WebchatAdapter } from './adapters/webchat/webchat.adapter';
import { ContactConversationsController } from './controllers/contact-conversations.controller';
import { ConversationsController } from './controllers/conversations.controller';
import { PlatformCannedResponsesController } from './controllers/platform-canned-responses.controller';
import { PlatformContactConversationsController } from './controllers/platform-contact-conversations.controller';
import { PlatformConversationsController } from './controllers/platform-conversations.controller';
import { ConversationIntegrationRepository } from './repositories/conversation-integration.repository';
import { ConversationMessagesRepository } from './repositories/conversation-messages.repository';
import { ConversationsRepository } from './repositories/conversations.repository';
import { ConversationAssignmentService } from './services/conversation-assignment.service';
import { ConversationContactResolverService } from './services/conversation-contact-resolver.service';
import { ConversationMessagesService } from './services/conversation-messages.service';
import { ConversationRealtimeService } from './services/conversation-realtime.service';
import { ConversationWebhookIngestionService } from './services/conversation-webhook-ingestion.service';
import { WhatsAppDeliveryStatusBufferService } from './services/whatsapp-delivery-status-buffer.service';
import { ConversationsService } from './services/conversations.service';
import { ContactConversationsService } from './services/contact-conversations.service';
import { ContactIdentityBackfillService } from './services/contact-identity-backfill.service';
import { EmailConversationsService } from './services/email-conversations.service';
import { MetaConversationsService } from './services/meta-conversations.service';
import { SmsConversationsService } from './services/sms-conversations.service';
import { UnifiedConversationsService } from './services/unified-conversations.service';
import { WhatsAppParticipantSyncService } from './services/whatsapp-participant-sync.service';
import { WhatsAppSessionWindowService } from './services/whatsapp-session-window.service';
import { ConversationNotesRepository } from './repositories/conversation-notes.repository';
import { ConversationNotesService } from './services/conversation-notes.service';
import { CannedResponsesRepository } from './repositories/canned-responses.repository';
import { CannedResponsesService } from './services/canned-responses.service';
import { CannedResponsesController } from './controllers/canned-responses.controller';
import { ConversationActivityService } from './services/conversation-activity.service';
import { ChatbotsModule } from '../chatbots/chatbots.module';
import { TwilioModule } from '@app/modules/integrations/twilio/twilio.module';

@Module({
  imports: [
    AuditModule,
    IdempotencyModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => ContactsModule),
    WebhookEventsModule,
    forwardRef(() => EmailModule),
    forwardRef(() => IntegrationsModule),
    forwardRef(() => SendMessageProcessorModule),
    forwardRef(() => ChatbotsModule),
    TwilioModule,
  ],
  controllers: [
    ConversationsController,
    ContactConversationsController,
    CannedResponsesController,
    PlatformConversationsController,
    PlatformContactConversationsController,
    PlatformCannedResponsesController,
  ],
  providers: [
    ConversationsRepository,
    ConversationMessagesRepository,
    ConversationIntegrationRepository,
    ConversationsService,
    UnifiedConversationsService,
    ContactConversationsService,
    ContactIdentityBackfillService,
    ConversationMessagesService,
    ConversationContactResolverService,
    ConversationAssignmentService,
    ConversationActivityService,
    ConversationRealtimeService,
    ConversationWebhookIngestionService,
    WhatsAppDeliveryStatusBufferService,
    EmailConversationsService,
    MetaConversationsService,
    SmsConversationsService,
    WhatsAppSessionWindowService,
    WhatsAppParticipantSyncService,
    EmailMessagingAdapter,
    FacebookMessengerAdapter,
    InstagramMessagingAdapter,
    WhatsAppMessagingAdapter,
    SmsMessagingAdapter,
    WebchatAdapter,
    ConversationChannelAdapterRegistry,
    OutboundMessageDispatchService,
    OutboundMessageRecoveryService,
    ConversationNotesRepository,
    ConversationNotesService,
    CannedResponsesRepository,
    CannedResponsesService,
  ],
  exports: [
    ConversationWebhookIngestionService,
    ConversationRealtimeService,
    ConversationsService,
    WebhookEventsModule,
    ConversationMessagesRepository,
    ConversationsRepository,
    ConversationChannelAdapterRegistry,
    WhatsAppSessionWindowService,
    WhatsAppParticipantSyncService,
    ConversationRealtimeService,
    ConversationNotesService,
    CannedResponsesService,
    ConversationActivityService,
  ],
})
export class ConversationsModule {}
