import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { EnsureContactConversationDto } from '../dto/ensure-contact-conversation.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { ContactConversationsService } from '../services/contact-conversations.service';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('conversations')
export class ContactConversationsController {
  constructor(
    private readonly contactConversationsService: ContactConversationsService,
  ) {}

  @Get(':contactId/messages')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listMessages(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.contactConversationsService.listMessages(
      user.businessId!,
      contactId,
      query,
    );
  }

  @Get(':contactId/reply-channels')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listReplyChannels(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.contactConversationsService.listReplyChannels(
      user.businessId!,
      contactId,
    );
  }

  @Post(':contactId/conversations/ensure')
  @HttpCode(HttpStatus.OK)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  ensureConversation(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: EnsureContactConversationDto,
  ) {
    return this.contactConversationsService.ensureConversation(
      user.businessId!,
      contactId,
      dto,
      user,
    );
  }
}
