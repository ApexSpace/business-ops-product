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
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { ListPlatformUsersQueryDto } from '../dto/list-platform-users-query.dto';
import {
  CreatePlatformUserDto,
  UpdatePlatformUserDto,
} from '../dto/platform-user.dto';
import { PlatformUserDto } from '../dto/platform-user-response.dto';
import { PlatformUserService } from '@app/modules/platform/membership/services/platform-user.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/users')
@UseGuards(PlatformRolesGuard)
export class PlatformUsersController {
  constructor(private readonly platformUserService: PlatformUserService) {}

  @Get()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  list(@Query() query: ListPlatformUsersQueryDto): Promise<{
    items: PlatformUserDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip } = getPaginationParams(query);
    return this.platformUserService.list({
      page,
      limit,
      skip,
      role: query.role,
    });
  }

  @Post()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  create(
    @Body() dto: CreatePlatformUserDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlatformUserDto> {
    return this.platformUserService.create(dto, user);
  }

  @Patch(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformUserDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlatformUserDto> {
    return this.platformUserService.update(id, dto, user);
  }

  @Delete(':id')
  @PlatformRoles(PlatformMemberRole.SUPER_ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.platformUserService.remove(id, user);
  }
}
