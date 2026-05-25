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
import { PlanStatus, PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PlatformRolesGuard } from '../../../common/guards/platform-roles.guard';
import { getPaginationParams } from '../../../common/utils/pagination.util';
import { CreatePlanDto, PlanResponseDto, UpdatePlanDto } from '../dto/plan.dto';
import { PlansService } from '../services/plans.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/plans')
@UseGuards(PlatformRolesGuard)
export class PlatformPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  list(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: PlanStatus,
  ) {
    const { page, limit, skip } = getPaginationParams(query);
    return this.plansService.list({ page, limit, skip, status });
  }

  @Post()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  create(
    @Body() dto: CreatePlanDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanResponseDto> {
    return this.plansService.create(dto, user);
  }

  @Patch(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanResponseDto> {
    return this.plansService.update(id, dto, user);
  }

  @Delete(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.plansService.remove(id, user);
  }
}
