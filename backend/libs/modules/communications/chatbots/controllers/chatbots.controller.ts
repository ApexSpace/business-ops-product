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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateChatbotDto,
  CreateChatbotRuleDto,
  ListChatbotsQueryDto,
  UpdateChatbotDto,
  UpdateChatbotRuleDto,
} from '../dto/chatbot.dto';
import { ChatbotRulesService } from '../services/chatbot-rules.service';
import { ChatbotsService } from '../services/chatbots.service';

@ApiTags('chatbots')
@ApiBearerAuth()
@Controller('chatbots')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('ai_agents')
export class ChatbotsController {
  constructor(
    private readonly chatbotsService: ChatbotsService,
    private readonly rulesService: ChatbotRulesService,
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
    return this.chatbotsService.update(user.businessId!, id, dto);
  }

  @Delete(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.remove(user.businessId!, id);
  }

  @Post(':id/duplicate')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  duplicate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.duplicate(user.businessId!, id);
  }

  @Post(':id/activate')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  activate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.activate(user.businessId!, id);
  }

  @Post(':id/disable')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  disable(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatbotsService.disable(user.businessId!, id);
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

  @Post(':id/rules')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChatbotRuleDto,
  ) {
    return this.rulesService.create(user.businessId!, id, dto);
  }

  @Patch(':id/rules/:ruleId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateChatbotRuleDto,
  ) {
    return this.rulesService.update(user.businessId!, id, ruleId, dto);
  }

  @Delete(':id/rules/:ruleId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  deleteRule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    return this.rulesService.remove(user.businessId!, id, ruleId);
  }
}
