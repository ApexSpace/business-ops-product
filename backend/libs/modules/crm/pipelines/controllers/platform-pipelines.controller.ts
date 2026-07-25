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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { BusinessLifecycleService } from '@app/modules/platform/business/services/business-lifecycle.service';
import { CreatePipelineDto } from '../dto/create-pipeline.dto';
import { UpdatePipelineDto } from '../dto/update-pipeline.dto';
import { PipelinesService } from '../services/pipelines.service';
import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class MoveLifecycleBusinessDto {
  @ApiProperty()
  @IsUUID()
  stageId!: string;
}

const PLATFORM_PIPELINES_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-pipelines')
@ApiBearerAuth()
@Controller('platform/pipelines')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_PIPELINES_ROLES)
export class PlatformPipelinesController {
  constructor(
    private readonly pipelinesService: PipelinesService,
    private readonly internalBusiness: InternalBusinessService,
    private readonly businessLifecycle: BusinessLifecycleService,
  ) {}

  @Get()
  async list() {
    const businessId = await this.internalBusiness.getId();
    return this.pipelinesService.list(businessId);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePipelineDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.pipelinesService.create(businessId, dto, user);
  }

  @Get(':id/board')
  async board(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.businessLifecycle.listBoardCards(id, businessId);
  }

  @Patch(':id/board/:businessId/stage')
  async moveCard(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) _pipelineId: string,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: MoveLifecycleBusinessDto,
  ) {
    return this.businessLifecycle.moveLifecycleStage({
      businessId,
      pipelineStageId: dto.stageId,
      actorUserId: user.id,
    });
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.pipelinesService.getById(businessId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.pipelinesService.update(businessId, id, dto, user);
  }

  @Delete(':id')
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.pipelinesService.remove(businessId, id, user);
  }
}
