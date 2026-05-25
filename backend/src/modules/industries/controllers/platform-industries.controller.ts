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
import { IndustryStatus, PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PlatformRolesGuard } from '../../../common/guards/platform-roles.guard';
import { getPaginationParams } from '../../../common/utils/pagination.util';
import {
  CreateIndustryDto,
  IndustryOptionDto,
  IndustryResponseDto,
  UpdateIndustryDto,
} from '../dto/industry.dto';
import { IndustriesService } from '../services/industries.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/industries')
@UseGuards(PlatformRolesGuard)
export class PlatformIndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  list(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: IndustryStatus,
  ) {
    const { page, limit, skip } = getPaginationParams(query);
    return this.industriesService.list({ page, limit, skip, status });
  }

  @Get('active')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  listActive(): Promise<IndustryOptionDto[]> {
    return this.industriesService.listActiveOptions();
  }

  @Get(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  get(@Param('id', ParseUUIDPipe) id: string): Promise<IndustryResponseDto> {
    return this.industriesService.get(id);
  }

  @Post()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  create(
    @Body() dto: CreateIndustryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<IndustryResponseDto> {
    return this.industriesService.create(dto, user);
  }

  @Patch(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIndustryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<IndustryResponseDto> {
    return this.industriesService.update(id, dto, user);
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
    return this.industriesService.remove(id, user);
  }
}
