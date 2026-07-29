import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import {
  BusinessMemberRole,
  ChatbotIdentityRefType,
} from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateChatbotDto,
  CreateChatbotRuleDto,
  ImportChatbotRulesDto,
  ListChatbotsQueryDto,
  PreviewChatbotRuleDto,
  ReorderChatbotRulesDto,
  UpdateChatbotDto,
  UpdateChatbotRuleDto,
} from '../dto/chatbot.dto';
import { ChatbotRulesService } from '../services/chatbot-rules.service';
import { ChatbotSessionService } from '../services/chatbot-session.service';
import { ChatbotsService } from '../services/chatbots.service';

class ListSessionsByIdentityQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  identityRefId!: string;

  @ApiPropertyOptional({ enum: ChatbotIdentityRefType })
  @IsEnum(ChatbotIdentityRefType)
  identityRefType!: ChatbotIdentityRefType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  chatbotId?: string;
}

@ApiTags('chatbots')
@ApiBearerAuth()
@Controller('chatbots')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('ai_agents')
export class ChatbotsController {
  constructor(
    private readonly chatbotsService: ChatbotsService,
    private readonly rulesService: ChatbotRulesService,
    private readonly sessionService: ChatbotSessionService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser, @Query() query: ListChatbotsQueryDto) {
    return this.chatbotsService.list(user.businessId!, query);
  }

  @Get('sessions')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listSessionsByIdentity(
    @CurrentUser() user: RequestUser,
    @Query() query: ListSessionsByIdentityQueryDto,
  ) {
    return this.sessionService.listByIdentity(user.businessId!, query);
  }

  @Post()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateChatbotDto) {
    return this.chatbotsService.create(user.businessId!, dto, user);
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
    return this.chatbotsService.get(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChatbotDto,
  ) {
    return this.chatbotsService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.chatbotsService.remove(user.businessId!, id, user);
  }

  @Post(':id/duplicate')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  duplicate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.duplicate(user.businessId!, id, user);
  }

  @Post(':id/activate')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  activate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.activate(user.businessId!, id, user);
  }

  @Post(':id/disable')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  disable(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.disable(user.businessId!, id, user);
  }

  @Get(':id/embed')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  embed(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.getEmbedForChatbot(user.businessId!, id);
  }

  @Get(':id/rules')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listRules(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rulesService.list(user.businessId!, id);
  }

  @Get(':id/rules/export')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  exportRules(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rulesService.exportRules(user.businessId!, id);
  }

  @Post(':id/rules/import')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  importRules(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImportChatbotRulesDto,
  ) {
    return this.rulesService.importRules(user.businessId!, id, dto, user);
  }

  @Post(':id/rules/preview')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  previewRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewChatbotRuleDto,
  ) {
    return this.rulesService.preview(user.businessId!, id, dto);
  }

  @Patch(':id/rules/reorder')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  reorderRules(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderChatbotRulesDto,
  ) {
    return this.rulesService.reorder(user.businessId!, id, dto, user);
  }

  @Post(':id/rules')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChatbotRuleDto,
  ) {
    return this.rulesService.create(user.businessId!, id, dto, user);
  }

  @Patch(':id/rules/:ruleId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateChatbotRuleDto,
  ) {
    return this.rulesService.update(user.businessId!, id, ruleId, dto, user);
  }

  @Delete(':id/rules/:ruleId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  deleteRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.rulesService.remove(user.businessId!, id, ruleId, user);
  }

  @Post('sessions/:sessionId/end')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  endSession(
    @CurrentUser() user: RequestUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessionService.endSession(user.businessId!, sessionId, user);
  }

  @Post('sessions/:sessionId/convert')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  convertSession(
    @CurrentUser() user: RequestUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessionService.convertSession(
      user.businessId!,
      sessionId,
      user,
    );
  }
}
