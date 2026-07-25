import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { CreatePipelineStageDto } from '../dto/create-pipeline-stage.dto';
import { ReorderPipelineStagesDto } from '../dto/reorder-pipeline-stages.dto';
import { UpdatePipelineStageDto } from '../dto/update-pipeline-stage.dto';
import { PipelineStagesService } from '../services/pipeline-stages.service';

const PLATFORM_PIPELINES_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-pipelines')
@ApiBearerAuth()
@Controller('platform/pipelines/:pipelineId/stages')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_PIPELINES_ROLES)
export class PlatformPipelineStagesController {
  constructor(
    private readonly stagesService: PipelineStagesService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreatePipelineStageDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.stagesService.create(businessId, pipelineId, dto, user);
  }

  @Patch('reorder')
  async reorder(
    @CurrentUser() user: RequestUser,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: ReorderPipelineStagesDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.stagesService.reorder(businessId, pipelineId, dto, user);
  }

  @Patch(':stageId')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdatePipelineStageDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.stagesService.update(
      businessId,
      pipelineId,
      stageId,
      dto,
      user,
    );
  }

  @Delete(':stageId')
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
  })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.stagesService.remove(businessId, pipelineId, stageId, user);
  }
}
