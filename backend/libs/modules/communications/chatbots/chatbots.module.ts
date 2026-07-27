import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChatbotWidgetsController } from './controllers/chatbot-widgets.controller';
import { ChatbotsController } from './controllers/chatbots.controller';
import { PlatformChatbotsController } from './controllers/platform-chatbots.controller';
import { PublicChatbotController } from './controllers/public-chatbot.controller';
import {
  ChatIdentityResolverService,
  ContactIdentityResolver,
  PlatformCustomerIdentityResolver,
} from './identity/chat-identity-resolver.service';
import { ChatbotRulesRepository } from './repositories/chatbot-rules.repository';
import { ChatbotSessionsRepository } from './repositories/chatbot-sessions.repository';
import { ChatbotsRepository } from './repositories/chatbots.repository';
import { ChatbotAutoReplyService } from './services/chatbot-auto-reply.service';
import { ChatbotContactResolverService } from './services/chatbot-contact-resolver.service';
import { ChatbotEmbedService } from './services/chatbot-embed.service';
import { ChatbotPersonalizationPipelineService } from './services/chatbot-personalization-pipeline.service';
import { ChatbotWidgetPageService } from './services/chatbot-widget-page.service';
import { ChatbotRulesService } from './services/chatbot-rules.service';
import { ChatbotsService } from './services/chatbots.service';
import { PublicChatbotSessionService } from './services/public-chatbot-session.service';
import { ChatbotSessionService } from './services/chatbot-session.service';

@Module({
  imports: [
    JwtModule.register({}),
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => ContactsModule),
    forwardRef(() => ConversationsModule),
  ],
  controllers: [
    ChatbotsController,
    PlatformChatbotsController,
    PublicChatbotController,
    ChatbotWidgetsController,
  ],
  providers: [
    ChatbotsRepository,
    ChatbotRulesRepository,
    ChatbotSessionsRepository,
    ChatbotsService,
    ChatbotRulesService,
    ChatbotEmbedService,
    ChatbotWidgetPageService,
    ChatbotAutoReplyService,
    ChatbotContactResolverService,
    ChatbotSessionService,
    PublicChatbotSessionService,
    ChatbotPersonalizationPipelineService,
    ContactIdentityResolver,
    PlatformCustomerIdentityResolver,
    ChatIdentityResolverService,
  ],
  exports: [
    ChatbotsRepository,
    PublicChatbotSessionService,
    ChatbotSessionService,
    ChatbotSessionsRepository,
  ],
})
export class ChatbotsModule {}
