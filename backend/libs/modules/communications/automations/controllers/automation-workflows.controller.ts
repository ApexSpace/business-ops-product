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
import { RequireCapability } from '@app/common/decorators/require-capability.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateAutomationWorkflowDto,
  ListAutomationWorkflowRunsQueryDto,
  ListAutomationWorkflowsQueryDto,
  UpdateAutomationWorkflowDto,
  UpdateAutomationWorkflowStatusDto,
} from '../dto/automation-workflow.dto';
import { AutomationWorkflowsService } from '../services/automation-workflows.service';

@ApiTags('automations')
@ApiBearerAuth()
@Controller('automations/workflows')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('settings')
export class AutomationWorkflowsController {
  constructor(private readonly workflowsService: AutomationWorkflowsService) {}

  @Get()
  @RequireCapability('settings.automations.list')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListAutomationWorkflowsQueryDto,
  ) {
    return this.workflowsService.list(user.businessId!, query);
  }

  @Post()
  @RequireCapability('settings.automations.create')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAutomationWorkflowDto,
  ) {
    return this.workflowsService.create(user.businessId!, dto, user);
  }

  @Get('runs')
  @RequireCapability('settings.automations.list')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listRuns(
    @CurrentUser() user: RequestUser,
    @Query() query: ListAutomationWorkflowRunsQueryDto,
  ) {
    return this.workflowsService.listRuns(user.businessId!, query);
  }

  @Get('runs/:runId')
  @RequireCapability('settings.automations.list')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getRun(
    @CurrentUser() user: RequestUser,
    @Param('runId', ParseUUIDPipe) runId: string,
  ) {
    return this.workflowsService.getRun(user.businessId!, runId);
  }

  @Get(':id')
  @RequireCapability('settings.automations.list')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflowsService.get(user.businessId!, id);
  }

  @Patch(':id')
  @RequireCapability('settings.automations.edit')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationWorkflowDto,
  ) {
    return this.workflowsService.update(user.businessId!, id, dto, user);
  }

  @Patch(':id/status')
  @RequireCapability('settings.automations.edit')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationWorkflowStatusDto,
  ) {
    return this.workflowsService.updateStatus(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Delete(':id')
  @RequireCapability('settings.automations.delete')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflowsService.remove(user.businessId!, id, user);
  }
}
