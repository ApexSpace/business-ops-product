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
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { EnsureContactConversationDto } from '../dto/ensure-contact-conversation.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { ContactConversationsService } from '../services/contact-conversations.service';

const PLATFORM_CONVERSATIONS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-contacts')
@ApiBearerAuth()
@Controller('platform/contacts')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_CONVERSATIONS_ROLES)
export class PlatformContactConversationsController {
  constructor(
    private readonly contactConversationsService: ContactConversationsService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Get(':contactId/messages')
  async listMessages(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.contactConversationsService.listMessages(
      businessId,
      contactId,
      query,
      user,
    );
  }

  @Get(':contactId/reply-channels')
  async listReplyChannels(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.contactConversationsService.listReplyChannels(
      businessId,
      contactId,
      user,
    );
  }

  @Post(':contactId/conversations/ensure')
  @HttpCode(HttpStatus.OK)
  async ensureConversation(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: EnsureContactConversationDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.contactConversationsService.ensureConversation(
      businessId,
      contactId,
      dto,
      user,
    );
  }
}
