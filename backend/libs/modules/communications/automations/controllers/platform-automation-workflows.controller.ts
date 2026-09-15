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
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import {
  CreateAutomationWorkflowDto,
  ListAutomationWorkflowRunsQueryDto,
  ListAutomationWorkflowsQueryDto,
  UpdateAutomationWorkflowDto,
  UpdateAutomationWorkflowStatusDto,
} from '../dto/automation-workflow.dto';
import { AutomationWorkflowsService } from '../services/automation-workflows.service';

const PLATFORM_AUTOMATIONS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

const PLATFORM_AUDIENCE = 'platform' as const;

@ApiTags('platform-automations')
@ApiBearerAuth()
@Controller('platform/automations/workflows')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_AUTOMATIONS_ROLES)
export class PlatformAutomationWorkflowsController {
  constructor(
    private readonly workflowsService: AutomationWorkflowsService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Get()
  async list(@Query() query: ListAutomationWorkflowsQueryDto) {
    const businessId = await this.internalBusiness.getId();
    return this.workflowsService.list(businessId, query);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAutomationWorkflowDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.workflowsService.create(
      businessId,
      dto,
      user,
      PLATFORM_AUDIENCE,
    );
  }

  @Get('runs')
  async listRuns(@Query() query: ListAutomationWorkflowRunsQueryDto) {
    const businessId = await this.internalBusiness.getId();
    return this.workflowsService.listRuns(businessId, query);
  }

  @Get('runs/:runId')
  async getRun(@Param('runId', ParseUUIDPipe) runId: string) {
    const businessId = await this.internalBusiness.getId();
    return this.workflowsService.getRun(businessId, runId);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.workflowsService.get(businessId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationWorkflowDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.workflowsService.update(
      businessId,
      id,
      dto,
      user,
      PLATFORM_AUDIENCE,
    );
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationWorkflowStatusDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.workflowsService.updateStatus(
      businessId,
      id,
      dto,
      user,
      PLATFORM_AUDIENCE,
    );
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.workflowsService.remove(businessId, id, user);
  }
}
