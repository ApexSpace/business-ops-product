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
  ChatbotIdentityRefType,
  PlatformMemberRole,
} from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
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

const PLATFORM_CHATBOTS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-chatbots')
@ApiBearerAuth()
@Controller('platform/chatbots')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_CHATBOTS_ROLES)
export class PlatformChatbotsController {
  constructor(
    private readonly chatbotsService: ChatbotsService,
    private readonly rulesService: ChatbotRulesService,
    private readonly sessionService: ChatbotSessionService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Get()
  async list(@Query() query: ListChatbotsQueryDto) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.list(businessId, query);
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateChatbotDto) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.create(businessId, dto, user);
  }

  @Get('sessions')
  async listSessionsByIdentity(@Query() query: ListSessionsByIdentityQueryDto) {
    const businessId = await this.internalBusiness.getId();
    return this.sessionService.listByIdentity(businessId, query);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.get(businessId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChatbotDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.update(businessId, id, dto, user);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.remove(businessId, id, user);
  }

  @Post(':id/duplicate')
  async duplicate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.duplicate(businessId, id, user);
  }

  @Post(':id/activate')
  async activate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.activate(businessId, id, user);
  }

  @Post(':id/disable')
  async disable(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.disable(businessId, id, user);
  }

  @Get(':id/embed')
  async embed(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.chatbotsService.getEmbedForChatbot(businessId, id);
  }

  @Get(':id/rules')
  async listRules(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.rulesService.list(businessId, id);
  }

  @Get(':id/rules/export')
  async exportRules(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.rulesService.exportRules(businessId, id);
  }

  @Post(':id/rules/import')
  async importRules(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImportChatbotRulesDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.rulesService.importRules(businessId, id, dto, user);
  }

  @Post(':id/rules/preview')
  async previewRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewChatbotRuleDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.rulesService.preview(businessId, id, dto);
  }

  @Patch(':id/rules/reorder')
  async reorderRules(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderChatbotRulesDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.rulesService.reorder(businessId, id, dto, user);
  }

  @Post(':id/rules')
  async createRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChatbotRuleDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.rulesService.create(businessId, id, dto, user);
  }

  @Patch(':id/rules/:ruleId')
  async updateRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateChatbotRuleDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.rulesService.update(businessId, id, ruleId, dto, user);
  }

  @Delete(':id/rules/:ruleId')
  async deleteRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.rulesService.remove(businessId, id, ruleId, user);
  }

  @Post('sessions/:sessionId/end')
  async endSession(
    @CurrentUser() user: RequestUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.sessionService.endSession(businessId, sessionId, user);
  }

  @Post('sessions/:sessionId/convert')
  async convertSession(
    @CurrentUser() user: RequestUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.sessionService.convertSession(businessId, sessionId, user);
  }
}
