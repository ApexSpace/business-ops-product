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
import { PlatformMemberRole, SnapshotStatus } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import {
  ApplySnapshotDto,
  CreateSnapshotDto,
  SnapshotListItemDto,
  SnapshotResponseDto,
  UpdateSnapshotDto,
} from '../dto/snapshot.dto';
import { SnapshotsService } from '../services/snapshots.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/snapshots')
@UseGuards(PlatformRolesGuard)
export class PlatformSnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Get()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  list(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: SnapshotStatus,
  ) {
    const { page, limit, skip } = getPaginationParams(query);
    return this.snapshotsService.list({ page, limit, skip, status });
  }

  @Get(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  get(@Param('id', ParseUUIDPipe) id: string): Promise<SnapshotResponseDto> {
    return this.snapshotsService.get(id);
  }

  @Post()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  create(
    @Body() dto: CreateSnapshotDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SnapshotResponseDto> {
    return this.snapshotsService.create(dto, user);
  }

  @Patch(':id')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSnapshotDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SnapshotResponseDto> {
    return this.snapshotsService.update(id, dto, user);
  }

  @Post(':id/publish')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SnapshotResponseDto> {
    return this.snapshotsService.publish(id, user);
  }

  @Post(':id/archive')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SnapshotResponseDto> {
    return this.snapshotsService.archive(id, user);
  }

  @Post(':id/clone')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  clone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SnapshotResponseDto> {
    return this.snapshotsService.clone(id, user);
  }

  @Post(':id/apply')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  apply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplySnapshotDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.snapshotsService.apply(id, dto.businessId, user);
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
    return this.snapshotsService.remove(id, user);
  }
}
