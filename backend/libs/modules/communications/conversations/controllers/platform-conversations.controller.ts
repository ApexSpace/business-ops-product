import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChatbotSessionStatus, PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { ChatbotSessionService } from '@app/modules/communications/chatbots/services/chatbot-session.service';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { AssignConversationDto } from '../dto/assign-conversation.dto';
import { CreateConversationNoteDto } from '../dto/conversation-note.dto';
import { ListConversationsQueryDto } from '../dto/list-conversations-query.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { StartEmailConversationDto } from '../dto/start-email-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { ConversationAssignmentService } from '../services/conversation-assignment.service';
import { ConversationMessagesService } from '../services/conversation-messages.service';
import { ConversationNotesService } from '../services/conversation-notes.service';
import { ConversationsService } from '../services/conversations.service';
import { EmailConversationsService } from '../services/email-conversations.service';
import { UnifiedConversationsService } from '../services/unified-conversations.service';

const PLATFORM_CONVERSATIONS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-conversations')
@ApiBearerAuth()
@Controller('platform/conversations')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_CONVERSATIONS_ROLES)
export class PlatformConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly unifiedConversationsService: UnifiedConversationsService,
    private readonly messagesService: ConversationMessagesService,
    private readonly assignmentService: ConversationAssignmentService,
    private readonly emailConversationsService: EmailConversationsService,
    private readonly notesService: ConversationNotesService,
    private readonly chatbotSessionService: ChatbotSessionService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Post('email/start')
  @HttpCode(HttpStatus.CREATED)
  async startEmailConversation(
    @CurrentUser() user: RequestUser,
    @Body() dto: StartEmailConversationDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.emailConversationsService.startConversation(
      businessId,
      dto,
      user,
    );
  }

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListConversationsQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.conversationsService.list(businessId, query, user);
  }

  @Get('unified')
  async listUnified(
    @CurrentUser() user: RequestUser,
    @Query() query: ListConversationsQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.unifiedConversationsService.list(businessId, query, user);
  }

  @Get('by-contact/:contactId')
  async listByContact(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.conversationsService.listByContact(
      businessId,
      contactId,
      user,
    );
  }

  @Get('ops-context')
  async opsContext() {
    const businessId = await this.internalBusiness.getId();
    return { businessId };
  }

  @Get(':id')
  async get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.conversationsService.getById(businessId, id, user);
  }

  @Get(':id/messages')
  async listMessages(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.messagesService.list(businessId, id, query, user);
  }

  @Delete(':id/messages/:messageId')
  async removeMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.messagesService.remove(businessId, id, messageId, user);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.messagesService.send(
      businessId,
      id,
      dto,
      user,
      idempotencyKey,
    );
  }

  @Post(':id/messages/:messageId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  async retryMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.messagesService.retry(
      businessId,
      id,
      messageId,
      user,
      idempotencyKey,
    );
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.conversationsService.update(businessId, id, dto, user);
  }

  @Post(':id/assign')
  async assign(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignConversationDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.assignmentService.assign(
      businessId,
      id,
      dto.assignedToUserId,
      user,
    );
  }

  @Post(':id/close')
  async close(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.assignmentService.close(businessId, id, user);
  }

  @Post(':id/reopen')
  async reopen(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.assignmentService.reopen(businessId, id, user);
  }

  @Post(':id/mark-spam')
  async markSpam(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.assignmentService.markSpam(businessId, id, user);
  }

  @Post(':id/unmark-spam')
  async unmarkSpam(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.assignmentService.unmarkSpam(businessId, id, user);
  }

  @Post(':id/block-contact')
  async blockContact(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.assignmentService.blockContact(businessId, id, user);
  }

  @Post(':id/unblock-contact')
  async unblockContact(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.assignmentService.unblockContact(businessId, id, user);
  }

  @Post(':id/mark-read')
  async markRead(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.assignmentService.markRead(businessId, id, user);
  }

  @Get(':id/notes')
  async listNotes(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.notesService.list(businessId, id, user);
  }

  @Post(':id/notes')
  async createNote(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConversationNoteDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.notesService.create(businessId, id, dto, user);
  }

  @Post(':id/end-chatbot-session')
  async endChatbotSession(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotSessionService.endActiveSessionForConversation(
      businessId,
      id,
      ChatbotSessionStatus.ENDED,
      user,
    );
  }

  @Post(':id/convert-chatbot-session')
  async convertChatbotSession(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotSessionService.endActiveSessionForConversation(
      businessId,
      id,
      ChatbotSessionStatus.CONVERTED,
      user,
    );
  }

  @Post(':id/pause-chatbot')
  async pauseChatbot(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotSessionService.pauseBotForConversation(
      businessId,
      id,
      user,
    );
  }

  @Post(':id/resume-chatbot')
  async resumeChatbot(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotSessionService.resumeBotForConversation(
      businessId,
      id,
      user,
    );
  }
}
