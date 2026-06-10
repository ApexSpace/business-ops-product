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
import {
  AssignTierCapabilitiesDto,
  CreatePlanFeatureRowDto,
  CreatePlanGroupDto,
  CreatePlanTierDto,
  ListPlanGroupsQueryDto,
  PlanEmbedSettingsDto,
  PlanFeatureRowDto,
  PlanGroupDetailDto,
  PlanGroupListItemDto,
  PlanGroupStatsDto,
  PlanTierDto,
  PublicPricingDto,
  ReorderPlanFeatureRowsDto,
  ReorderTierCapabilitiesDto,
  UpdatePlanEmbedSettingsDto,
  UpdatePlanFeatureRowDto,
  UpdatePlanGroupDto,
  UpdatePlanTierDto,
} from '../dto';
import { PlanEmbedService } from '../services/plan-embed.service';
import { PlanFeatureRowsService } from '../services/plan-feature-rows.service';
import { PlanGroupsService } from '../services/plan-groups.service';
import { PlanTierDefaultsService } from '../services/plan-tier-defaults.service';
import { PlanTiersService } from '../services/plan-tiers.service';

const READ_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

const WRITE_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
] as const;

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/plan-groups')
@UseGuards(PlatformRolesGuard)
export class PlatformPlanGroupsController {
  constructor(
    private readonly planGroupsService: PlanGroupsService,
    private readonly planTiersService: PlanTiersService,
    private readonly tierDefaultsService: PlanTierDefaultsService,
    private readonly featureRowsService: PlanFeatureRowsService,
    private readonly embedService: PlanEmbedService,
  ) {}

  @Get()
  @PlatformRoles(...READ_ROLES)
  list(@Query() query: ListPlanGroupsQueryDto): Promise<{
    items: PlanGroupListItemDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip } = getPaginationParams(query);
    return this.planGroupsService.list({
      page,
      limit,
      skip,
      status: query.status,
      search: query.search,
    });
  }

  @Get('stats')
  @PlatformRoles(...READ_ROLES)
  stats(): Promise<PlanGroupStatsDto> {
    return this.planGroupsService.getStats();
  }

  @Post()
  @PlatformRoles(...WRITE_ROLES)
  create(
    @Body() dto: CreatePlanGroupDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanGroupDetailDto> {
    return this.planGroupsService.create(dto, user);
  }

  @Get(':id')
  @PlatformRoles(...READ_ROLES)
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PlanGroupDetailDto> {
    return this.planGroupsService.get(id);
  }

  @Patch(':id')
  @PlatformRoles(...WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanGroupDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanGroupDetailDto> {
    return this.planGroupsService.update(id, dto, user);
  }

  @Delete(':id')
  @PlatformRoles(...WRITE_ROLES)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.planGroupsService.remove(id, user);
  }

  @Post(':id/publish')
  @PlatformRoles(...WRITE_ROLES)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanGroupDetailDto> {
    return this.planGroupsService.publish(id, user);
  }

  @Post(':id/move-to-draft')
  @PlatformRoles(...WRITE_ROLES)
  moveToDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanGroupDetailDto> {
    return this.planGroupsService.moveToDraft(id, user);
  }

  @Post(':id/archive')
  @PlatformRoles(...WRITE_ROLES)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanGroupDetailDto> {
    return this.planGroupsService.archive(id, user);
  }

  @Get(':id/preview')
  @PlatformRoles(...READ_ROLES)
  preview(@Param('id', ParseUUIDPipe) id: string): Promise<PublicPricingDto> {
    return this.planGroupsService.getPreview(id);
  }

  @Get(':id/defaults')
  @PlatformRoles(...READ_ROLES)
  groupDefaults(@Param('id', ParseUUIDPipe) id: string) {
    return this.tierDefaultsService.getGroupDefaults(id);
  }

  @Get(':id/tiers')
  @PlatformRoles(...READ_ROLES)
  listTiers(@Param('id', ParseUUIDPipe) id: string): Promise<PlanTierDto[]> {
    return this.planTiersService.list(id);
  }

  @Get(':id/tiers/:tierId/defaults')
  @PlatformRoles(...READ_ROLES)
  tierDefaults(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
  ) {
    return this.tierDefaultsService.getTierDefaults(id, tierId);
  }

  @Post(':id/tiers')
  @PlatformRoles(...WRITE_ROLES)
  createTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePlanTierDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanTierDto> {
    return this.planTiersService.create(id, dto, user);
  }

  @Patch(':id/tiers/:tierId')
  @PlatformRoles(...WRITE_ROLES)
  updateTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() dto: UpdatePlanTierDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanTierDto> {
    return this.planTiersService.update(id, tierId, dto, user);
  }

  @Delete(':id/tiers/:tierId')
  @PlatformRoles(...WRITE_ROLES)
  removeTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.planTiersService.remove(id, tierId, user);
  }

  @Post(':id/tiers/:tierId/publish')
  @PlatformRoles(...WRITE_ROLES)
  publishTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanTierDto> {
    return this.planTiersService.publish(id, tierId, user);
  }

  @Post(':id/tiers/:tierId/move-to-draft')
  @PlatformRoles(...WRITE_ROLES)
  moveTierToDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanTierDto> {
    return this.planTiersService.moveToDraft(id, tierId, user);
  }

  @Post(':id/tiers/:tierId/archive')
  @PlatformRoles(...WRITE_ROLES)
  archiveTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanTierDto> {
    return this.planTiersService.archive(id, tierId, user);
  }

  @Post(':id/tiers/:tierId/capabilities')
  @PlatformRoles(...WRITE_ROLES)
  assignCapabilities(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() dto: AssignTierCapabilitiesDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanTierDto> {
    return this.planTiersService.assignCapabilities(id, tierId, dto, user);
  }

  @Delete(':id/tiers/:tierId/capabilities/:capabilityId')
  @PlatformRoles(...WRITE_ROLES)
  removeCapability(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Param('capabilityId', ParseUUIDPipe) capabilityId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanTierDto> {
    return this.planTiersService.removeCapability(
      id,
      tierId,
      capabilityId,
      user,
    );
  }

  @Patch(':id/tiers/:tierId/capabilities/reorder')
  @PlatformRoles(...WRITE_ROLES)
  reorderCapabilities(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() dto: ReorderTierCapabilitiesDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanTierDto> {
    return this.planTiersService.reorderCapabilities(id, tierId, dto, user);
  }

  @Get(':id/feature-rows')
  @PlatformRoles(...READ_ROLES)
  listFeatureRows(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlanFeatureRowDto[]> {
    return this.featureRowsService.list(id);
  }

  @Post(':id/feature-rows')
  @PlatformRoles(...WRITE_ROLES)
  createFeatureRow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePlanFeatureRowDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanFeatureRowDto> {
    return this.featureRowsService.create(id, dto, user);
  }

  @Patch(':id/feature-rows/reorder')
  @PlatformRoles(...WRITE_ROLES)
  reorderFeatureRows(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderPlanFeatureRowsDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanFeatureRowDto[]> {
    return this.featureRowsService.reorder(id, dto, user);
  }

  @Patch(':id/feature-rows/:rowId')
  @PlatformRoles(...WRITE_ROLES)
  updateFeatureRow(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body() dto: UpdatePlanFeatureRowDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanFeatureRowDto> {
    return this.featureRowsService.update(id, rowId, dto, user);
  }

  @Delete(':id/feature-rows/:rowId')
  @PlatformRoles(...WRITE_ROLES)
  removeFeatureRow(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.featureRowsService.remove(id, rowId, user);
  }

  @Get(':id/embed')
  @PlatformRoles(...READ_ROLES)
  getEmbed(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlanEmbedSettingsDto> {
    return this.embedService.getSettings(id);
  }

  @Patch(':id/embed')
  @PlatformRoles(...WRITE_ROLES)
  updateEmbed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanEmbedSettingsDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlanEmbedSettingsDto> {
    return this.embedService.updateSettings(id, dto, user);
  }
}
