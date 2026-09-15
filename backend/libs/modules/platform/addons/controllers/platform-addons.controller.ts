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
import {
  AddonImpactPreviewDto,
  CreateAddonDto,
  ListAddonsQueryDto,
  MigrateAddonSubscribersDto,
  UpdateAddonDto,
} from '../dto/addon.dto';
import { AddonsService } from '../services/addons.service';

const READ_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

const WRITE_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
] as const;

@ApiTags('platform-addons')
@ApiBearerAuth()
@Controller('platform/addons')
@UseGuards(PlatformRolesGuard)
export class PlatformAddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Get()
  @PlatformRoles(...READ_ROLES)
  list(@Query() query: ListAddonsQueryDto) {
    return this.addonsService.list(query);
  }

  @Get(':id')
  @PlatformRoles(...READ_ROLES)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.addonsService.getById(id);
  }

  @Get(':id/subscribers')
  @PlatformRoles(...READ_ROLES)
  listSubscribers(@Param('id', ParseUUIDPipe) id: string) {
    return this.addonsService.listSubscribers(id);
  }

  @Post(':id/impact-preview')
  @PlatformRoles(...WRITE_ROLES)
  previewImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddonImpactPreviewDto,
  ) {
    return this.addonsService.previewImpact(id, dto);
  }

  @Post(':id/migrate-subscribers')
  @PlatformRoles(...WRITE_ROLES)
  migrateSubscribers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MigrateAddonSubscribersDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.addonsService.migrateSubscribers(id, dto, user);
  }

  @Post()
  @PlatformRoles(...WRITE_ROLES)
  create(@Body() dto: CreateAddonDto, @CurrentUser() user: RequestUser) {
    return this.addonsService.create(dto, user);
  }

  @Patch(':id')
  @PlatformRoles(...WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddonDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.addonsService.update(id, dto, user);
  }

  @Post(':id/stripe-prices/sync')
  @PlatformRoles(...WRITE_ROLES)
  syncStripePrices(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.addonsService.syncStripePrices(id, user);
  }

  @Delete(':id')
  @PlatformRoles(...WRITE_ROLES)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.addonsService.softDelete(id, user);
  }
}
