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
import { BusinessStatus, PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { CreateBusinessDto } from '../dto/create-business.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';
import { BusinessService } from '@app/modules/platform/business/services/business.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/businesses')
@UseGuards(PlatformRolesGuard)
export class PlatformBusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  create(
    @Body() dto: CreateBusinessDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.businessService.createPlatform(dto, user);
  }

  @Get()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  list(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: BusinessStatus,
  ) {
    const { page, limit, skip } = getPaginationParams(query);
    return this.businessService.listPlatform({ page, limit, skip, status });
  }

  @Get(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessService.getPlatform(id);
  }

  @Patch(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.businessService.updatePlatform(id, dto, user);
  }

  @Delete(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.businessService.deletePlatform(id, user);
  }
}
