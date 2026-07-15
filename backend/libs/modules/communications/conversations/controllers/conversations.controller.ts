import {
  Body,
  Controller,
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
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { RequireCapability } from '@app/common/decorators/require-capability.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { AssignConversationDto } from '../dto/assign-conversation.dto';
import { ListConversationsQueryDto } from '../dto/list-conversations-query.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { StartEmailConversationDto } from '../dto/start-email-conversation.dto';
import { ConversationAssignmentService } from '../services/conversation-assignment.service';
import { ConversationMessagesService } from '../services/conversation-messages.service';
import { ConversationsService } from '../services/conversations.service';
import { EmailConversationsService } from '../services/email-conversations.service';
import { BackfillContactIdentityQueryDto } from '../dto/backfill-contact-identity-query.dto';
import { ContactIdentityBackfillService } from '../services/contact-identity-backfill.service';
import { UnifiedConversationsService } from '../services/unified-conversations.service';
import { ConversationNotesService } from '../services/conversation-notes.service';
import { CreateConversationNoteDto } from '../dto/conversation-note.dto';
import { ChatbotSessionService } from '@app/modules/communications/chatbots/services/chatbot-session.service';
import { ChatbotSessionStatus } from '@prisma/client';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('conversations')
@StaffPermission('conversations.access')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly unifiedConversationsService: UnifiedConversationsService,
    private readonly messagesService: ConversationMessagesService,
    private readonly assignmentService: ConversationAssignmentService,
    private readonly emailConversationsService: EmailConversationsService,
    private readonly contactIdentityBackfillService: ContactIdentityBackfillService,
    private readonly notesService: ConversationNotesService,
    private readonly chatbotSessionService: ChatbotSessionService,
  ) {}

  @Post('email/start')
  @HttpCode(HttpStatus.CREATED)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.send')
  startEmailConversation(
    @CurrentUser() user: RequestUser,
    @Body() dto: StartEmailConversationDto,
  ) {
    return this.emailConversationsService.startConversation(
      user.businessId!,
      dto,
      user,
    );
  }

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.conversationsService.list(user.businessId!, query, user);
  }

  @Post('admin/backfill-contact-identity')
  @HttpCode(HttpStatus.OK)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @StaffPermission('conversations.access')
  backfillContactIdentity(
    @CurrentUser() user: RequestUser,
    @Query() query: BackfillContactIdentityQueryDto,
  ) {
    return this.contactIdentityBackfillService.run({
      businessId: query.businessId ?? user.businessId ?? undefined,
      dryRun: query.dryRun ?? true,
      includePhone: query.includePhone ?? true,
    });
  }

  @Get('unified')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listUnified(
    @CurrentUser() user: RequestUser,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.unifiedConversationsService.list(
      user.businessId!,
      query,
      user,
    );
  }

  @Get('by-contact/:contactId')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listByContact(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.conversationsService.listByContact(
      user.businessId!,
      contactId,
      user,
    );
  }

  @Get(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationsService.getById(user.businessId!, id, user);
  }

  @Get(':id/messages')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listMessages(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messagesService.list(user.businessId!, id, query, user);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @RequireCapability('conversations.send')
  @StaffPermission('conversations.send')
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.messagesService.send(
      user.businessId!,
      id,
      dto,
      user,
      idempotencyKey,
    );
  }

  @Patch(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.access')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(user.businessId!, id, dto, user);
  }

  @Post(':id/assign')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @StaffPermission('conversations.access')
  assign(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.assignmentService.assign(
      user.businessId!,
      id,
      dto.assignedToUserId,
      user,
    );
  }

  @Post(':id/close')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.access')
  close(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assignmentService.close(user.businessId!, id, user);
  }

  @Post(':id/reopen')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.access')
  reopen(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assignmentService.reopen(user.businessId!, id, user);
  }

  @Post(':id/mark-read')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.access')
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assignmentService.markRead(user.businessId!, id, user);
  }

  @Get(':id/notes')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listNotes(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notesService.list(user.businessId!, id, user);
  }

  @Post(':id/notes')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.send')
  createNote(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConversationNoteDto,
  ) {
    return this.notesService.create(user.businessId!, id, dto, user);
  }

  @Post(':id/end-chatbot-session')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.access')
  endChatbotSession(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotSessionService.endActiveSessionForConversation(
      user.businessId!,
      id,
      ChatbotSessionStatus.ENDED,
      user,
    );
  }

  @Post(':id/convert-chatbot-session')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.access')
  convertChatbotSession(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotSessionService.endActiveSessionForConversation(
      user.businessId!,
      id,
      ChatbotSessionStatus.CONVERTED,
      user,
    );
  }

  @Post(':id/pause-chatbot')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.access')
  pauseChatbot(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotSessionService.pauseBotForConversation(
      user.businessId!,
      id,
      user,
    );
  }

  @Post(':id/resume-chatbot')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('conversations.access')
  resumeChatbot(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotSessionService.resumeBotForConversation(
      user.businessId!,
      id,
      user,
    );
  }
}
