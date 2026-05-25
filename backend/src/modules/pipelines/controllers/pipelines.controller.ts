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
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '../../../common/dto/confirm-delete-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { BusinessRoles } from '../../../common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '../../../common/guards/business-roles.guard';
import { CreatePipelineDto } from '../dto/create-pipeline.dto';
import { UpdatePipelineDto } from '../dto/update-pipeline.dto';
import { PipelinesService } from '../services/pipelines.service';

@ApiTags('pipelines')
@ApiBearerAuth()
@Controller('pipelines')
@UseGuards(BusinessRolesGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser) {
    return this.pipelinesService.list(user.businessId!);
  }

  @Post()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePipelineDto) {
    return this.pipelinesService.create(user.businessId!, dto, user);
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
    return this.pipelinesService.getById(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.pipelinesService.remove(user.businessId!, id, user);
  }
}
