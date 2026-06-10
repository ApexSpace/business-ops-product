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
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { CreatePipelineStageDto } from '../dto/create-pipeline-stage.dto';
import { ReorderPipelineStagesDto } from '../dto/reorder-pipeline-stages.dto';
import { UpdatePipelineStageDto } from '../dto/update-pipeline-stage.dto';
import { PipelineStagesService } from '@app/modules/crm/pipelines/services/pipeline-stages.service';

@ApiTags('pipelines')
@ApiBearerAuth()
@Controller('pipelines/:pipelineId/stages')
@UseGuards(BusinessRolesGuard)
export class PipelineStagesController {
  constructor(private readonly stagesService: PipelineStagesService) {}

  @Post()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  create(
    @CurrentUser() user: RequestUser,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreatePipelineStageDto,
  ) {
    return this.stagesService.create(user.businessId!, pipelineId, dto, user);
  }

  @Patch('reorder')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  reorder(
    @CurrentUser() user: RequestUser,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: ReorderPipelineStagesDto,
  ) {
    return this.stagesService.reorder(user.businessId!, pipelineId, dto, user);
  }

  @Patch(':stageId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdatePipelineStageDto,
  ) {
    return this.stagesService.update(
      user.businessId!,
      pipelineId,
      stageId,
      dto,
      user,
    );
  }

  @Delete(':stageId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.stagesService.remove(
      user.businessId!,
      pipelineId,
      stageId,
      user,
    );
  }
}
