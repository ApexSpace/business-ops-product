import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChatbotWidgetsController } from './controllers/chatbot-widgets.controller';
import { ChatbotsController } from './controllers/chatbots.controller';
import { PublicChatbotController } from './controllers/public-chatbot.controller';
import { ChatbotRulesRepository } from './repositories/chatbot-rules.repository';
import { ChatbotSessionsRepository } from './repositories/chatbot-sessions.repository';
import { ChatbotsRepository } from './repositories/chatbots.repository';
import { ChatbotAutoReplyService } from './services/chatbot-auto-reply.service';
import { ChatbotContactResolverService } from './services/chatbot-contact-resolver.service';
import { ChatbotEmbedService } from './services/chatbot-embed.service';
import { ChatbotWidgetPageService } from './services/chatbot-widget-page.service';
import { ChatbotRulesService } from './services/chatbot-rules.service';
import { ChatbotsService } from './services/chatbots.service';
import { PublicChatbotSessionService } from './services/public-chatbot-session.service';
import { ChatbotSessionService } from './services/chatbot-session.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => BusinessModule),
    forwardRef(() => ContactsModule),
    forwardRef(() => ConversationsModule),
  ],
  controllers: [
    ChatbotsController,
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
  ],
  exports: [
    ChatbotsRepository,
    PublicChatbotSessionService,
    ChatbotSessionService,
    ChatbotSessionsRepository,
  ],
})
export class ChatbotsModule {}
