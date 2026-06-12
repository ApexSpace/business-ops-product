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
import { RequireModule } from '@app/common/decorators/require-module.decorator';
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

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly unifiedConversationsService: UnifiedConversationsService,
    private readonly messagesService: ConversationMessagesService,
    private readonly assignmentService: ConversationAssignmentService,
    private readonly emailConversationsService: EmailConversationsService,
    private readonly contactIdentityBackfillService: ContactIdentityBackfillService,
  ) {}

  @Post('email/start')
  @HttpCode(HttpStatus.CREATED)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
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
    return this.conversationsService.list(user.businessId!, query, user.id);
  }

  @Post('admin/backfill-contact-identity')
  @HttpCode(HttpStatus.OK)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
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
      user.id,
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
    return this.conversationsService.listByContact(user.businessId!, contactId);
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
    return this.conversationsService.getById(user.businessId!, id);
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
    return this.messagesService.list(user.businessId!, id, query);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
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
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(user.businessId!, id, dto, user);
  }

  @Post(':id/assign')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
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
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assignmentService.markRead(user.businessId!, id, user);
  }
}
