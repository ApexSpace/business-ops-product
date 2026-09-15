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
  CreateTierDto,
  ListTiersQueryDto,
  PublishTierVersionDto,
  UpdateTierDto,
} from '../dto/tier.dto';
import { TiersService } from '../services/tiers.service';

const READ_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

const WRITE_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
] as const;

@ApiTags('platform-tiers')
@ApiBearerAuth()
@Controller('platform/tiers')
@UseGuards(PlatformRolesGuard)
export class PlatformTiersController {
  constructor(private readonly tiersService: TiersService) {}

  @Get()
  @PlatformRoles(...READ_ROLES)
  list(@Query() query: ListTiersQueryDto) {
    return this.tiersService.list(query);
  }

  @Get(':id')
  @PlatformRoles(...READ_ROLES)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.tiersService.getById(id);
  }

  @Post()
  @PlatformRoles(...WRITE_ROLES)
  create(@Body() dto: CreateTierDto, @CurrentUser() user: RequestUser) {
    return this.tiersService.create(dto, user);
  }

  @Patch(':id')
  @PlatformRoles(...WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTierDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tiersService.update(id, dto, user);
  }

  @Post(':id/publish-version')
  @PlatformRoles(...WRITE_ROLES)
  publishVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishTierVersionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tiersService.publishVersion(id, dto, user);
  }

  @Get(':id/stripe-sync')
  @PlatformRoles(...READ_ROLES)
  getStripeSync(@Param('id', ParseUUIDPipe) id: string) {
    return this.tiersService.getStripeSyncStatus(id);
  }

  @Post(':id/stripe-sync')
  @PlatformRoles(...WRITE_ROLES)
  syncStripe(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tiersService.syncStripePrices(id, user);
  }

  @Delete(':id')
  @PlatformRoles(...WRITE_ROLES)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tiersService.softDelete(id, user);
  }
}
