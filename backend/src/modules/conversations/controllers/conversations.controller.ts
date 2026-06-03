import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { BusinessRoles } from '../../../common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '../../../common/guards/business-roles.guard';
import { AssignConversationDto } from '../dto/assign-conversation.dto';
import { ListConversationsQueryDto } from '../dto/list-conversations-query.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { ConversationAssignmentService } from '../services/conversation-assignment.service';
import { ConversationMessagesService } from '../services/conversation-messages.service';
import { ConversationsService } from '../services/conversations.service';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(BusinessRolesGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: ConversationMessagesService,
    private readonly assignmentService: ConversationAssignmentService,
  ) {}

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
    return this.conversationsService.list(
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
    return this.conversationsService.listByContact(
      user.businessId!,
      contactId,
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
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.send(user.businessId!, id, dto, user);
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
