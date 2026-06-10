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
  AssignCapabilityFeaturesDto,
  AssignedCapabilityFeatureDto,
  BulkAssignResultDto,
  CapabilityConfigSchemaResponseDto,
  CapabilityDetailDto,
  CapabilityLimitResponseDto,
  AssignedCapabilityModuleDto,
  AssignCapabilityModulesDto,
  BulkModuleAssignResultDto,
  SyncCapabilityModulesDto,
  CapabilityNavigationResponseDto,
  CapabilityPermissionResponseDto,
  CapabilityRegistryDiffDto,
  CapabilityRegistrySyncDto,
  CapabilityStatsDto,
  CreateCapabilityConfigSchemaDto,
  CreateCapabilityDto,
  CreateCapabilityLimitDto,
  CreateCapabilityNavigationDto,
  CreateCapabilityPermissionDto,
  CreateManualRegistryFeatureDto,
  ListCapabilitiesQueryDto,
  RegistryAvailableFeatureDto,
  RegistryModuleCatalogDto,
  UpdateCapabilityConfigSchemaDto,
  UpdateCapabilityDto,
  UpdateCapabilityFeatureAssignmentDto,
  UpdateCapabilityLimitDto,
  UpdateCapabilityNavigationDto,
  UpdateCapabilityPermissionDto,
} from '../dto';
import { CapabilityConfigSchemasService } from '../services/capability-config-schemas.service';
import { CapabilityFeaturesService } from '../services/capability-features.service';
import { CapabilityLimitsService } from '../services/capability-limits.service';
import { CapabilityModulesService } from '../services/capability-modules.service';
import { CapabilityNavigationService } from '../services/capability-navigation.service';
import { CapabilityPermissionsService } from '../services/capability-permissions.service';
import { CapabilityRegistrySyncService } from '../services/capability-registry-sync.service';
import { CapabilitiesService } from '../services/capabilities.service';

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
@Controller('platform/capabilities')
@UseGuards(PlatformRolesGuard)
export class PlatformCapabilitiesController {
  constructor(
    private readonly capabilitiesService: CapabilitiesService,
    private readonly modulesService: CapabilityModulesService,
    private readonly featuresService: CapabilityFeaturesService,
    private readonly permissionsService: CapabilityPermissionsService,
    private readonly limitsService: CapabilityLimitsService,
    private readonly navigationService: CapabilityNavigationService,
    private readonly configSchemasService: CapabilityConfigSchemasService,
    private readonly registrySyncService: CapabilityRegistrySyncService,
  ) {}

  @Get()
  @PlatformRoles(...READ_ROLES)
  list(@Query() query: ListCapabilitiesQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    return this.capabilitiesService.list({
      page,
      limit,
      skip,
      status: query.status,
      search: query.search,
    });
  }

  @Get('stats')
  @PlatformRoles(...READ_ROLES)
  stats(): Promise<CapabilityStatsDto> {
    return this.capabilitiesService.getStats();
  }

  @Get('registry/modules')
  @PlatformRoles(...READ_ROLES)
  listRegistryModules(): RegistryModuleCatalogDto[] {
    return this.modulesService.listCatalog();
  }

  @Get('registry')
  @PlatformRoles(...READ_ROLES)
  globalRegistryDiff(): Promise<CapabilityRegistryDiffDto> {
    return this.registrySyncService.getRegistryDiff();
  }

  @Post('sync-registry')
  @PlatformRoles(...WRITE_ROLES)
  syncRegistry(
    @Body() dto: CapabilityRegistrySyncDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityRegistryDiffDto> {
    return this.registrySyncService.sync({ dryRun: dto.dryRun }, user);
  }

  @Post()
  @PlatformRoles(...WRITE_ROLES)
  create(
    @Body() dto: CreateCapabilityDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityDetailDto> {
    return this.capabilitiesService.create(dto, user);
  }

  @Get(':id')
  @PlatformRoles(...READ_ROLES)
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CapabilityDetailDto> {
    return this.capabilitiesService.get(id);
  }

  @Patch(':id')
  @PlatformRoles(...WRITE_ROLES)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCapabilityDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityDetailDto> {
    return this.capabilitiesService.update(id, dto, user);
  }

  @Delete(':id')
  @PlatformRoles(...WRITE_ROLES)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.capabilitiesService.remove(id, user);
  }

  @Post(':id/activate')
  @PlatformRoles(...WRITE_ROLES)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityDetailDto> {
    return this.capabilitiesService.activate(id, user);
  }

  @Post(':id/deactivate')
  @PlatformRoles(...WRITE_ROLES)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityDetailDto> {
    return this.capabilitiesService.deactivate(id, user);
  }

  @Post(':id/deprecate')
  @PlatformRoles(...WRITE_ROLES)
  deprecate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityDetailDto> {
    return this.capabilitiesService.deprecate(id, user);
  }

  @Get(':id/available-features')
  @PlatformRoles(...READ_ROLES)
  availableFeatures(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RegistryAvailableFeatureDto[]> {
    return this.featuresService.getAvailableFeatures(id);
  }

  @Get(':id/features')
  @PlatformRoles(...READ_ROLES)
  listAssignedFeatures(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignedCapabilityFeatureDto[]> {
    return this.featuresService.listAssigned(id);
  }

  @Post(':id/features/assign')
  @PlatformRoles(...WRITE_ROLES)
  assignFeatures(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCapabilityFeaturesDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BulkAssignResultDto> {
    return this.featuresService.assignFeatures(id, dto.featureKeys, user);
  }

  @Patch(':id/features/:featureKey')
  @PlatformRoles(...WRITE_ROLES)
  updateFeatureAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: UpdateCapabilityFeatureAssignmentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<AssignedCapabilityFeatureDto> {
    return this.featuresService.updateAssignment(id, featureKey, dto, user);
  }

  @Delete(':id/features/:featureKey')
  @PlatformRoles(...WRITE_ROLES)
  unassignFeature(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('featureKey') featureKey: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.featuresService.unassignFeature(id, featureKey, user);
  }

  @Post(':id/features/manual')
  @PlatformRoles(...WRITE_ROLES)
  createManualFeature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateManualRegistryFeatureDto,
    @CurrentUser() user: RequestUser,
  ): Promise<AssignedCapabilityFeatureDto> {
    return this.featuresService.createManualRegistryFeature(
      id,
      dto,
      user,
      true,
    );
  }

  @Get(':id/modules')
  @PlatformRoles(...READ_ROLES)
  listAssignedModules(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignedCapabilityModuleDto[]> {
    return this.modulesService.listAssigned(id);
  }

  @Post(':id/modules/assign')
  @PlatformRoles(...WRITE_ROLES)
  assignModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCapabilityModulesDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BulkModuleAssignResultDto> {
    return this.modulesService.assignModules(id, dto.moduleKeys, user);
  }

  @Post(':id/modules/sync')
  @PlatformRoles(...WRITE_ROLES)
  syncModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncCapabilityModulesDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.modulesService.syncModules(id, dto.modules, user);
  }

  @Delete(':id/modules/:moduleKey')
  @PlatformRoles(...WRITE_ROLES)
  unassignModule(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleKey') moduleKey: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.modulesService.unassignModule(id, moduleKey, user);
  }

  @Get(':id/permissions')
  @PlatformRoles(...READ_ROLES)
  listPermissions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CapabilityPermissionResponseDto[]> {
    return this.permissionsService.list(id);
  }

  @Post(':id/permissions')
  @PlatformRoles(...WRITE_ROLES)
  createPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCapabilityPermissionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityPermissionResponseDto> {
    return this.permissionsService.create(id, dto, user);
  }

  @Patch(':id/permissions/:permissionId')
  @PlatformRoles(...WRITE_ROLES)
  updatePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @Body() dto: UpdateCapabilityPermissionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityPermissionResponseDto> {
    return this.permissionsService.update(id, permissionId, dto, user);
  }

  @Delete(':id/permissions/:permissionId')
  @PlatformRoles(...WRITE_ROLES)
  removePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.permissionsService.remove(id, permissionId, user);
  }

  // TODO: Capability limits will move to Plan Tier Limits; keep endpoints for API compatibility.
  @Get(':id/limits')
  @PlatformRoles(...READ_ROLES)
  listLimits(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CapabilityLimitResponseDto[]> {
    return this.limitsService.list(id);
  }

  @Post(':id/limits')
  @PlatformRoles(...WRITE_ROLES)
  createLimit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCapabilityLimitDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityLimitResponseDto> {
    return this.limitsService.create(id, dto, user);
  }

  @Patch(':id/limits/:limitId')
  @PlatformRoles(...WRITE_ROLES)
  updateLimit(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('limitId', ParseUUIDPipe) limitId: string,
    @Body() dto: UpdateCapabilityLimitDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityLimitResponseDto> {
    return this.limitsService.update(id, limitId, dto, user);
  }

  @Delete(':id/limits/:limitId')
  @PlatformRoles(...WRITE_ROLES)
  removeLimit(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('limitId', ParseUUIDPipe) limitId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.limitsService.remove(id, limitId, user);
  }

  @Get(':id/navigation')
  @PlatformRoles(...READ_ROLES)
  listNavigation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CapabilityNavigationResponseDto[]> {
    return this.navigationService.list(id);
  }

  @Post(':id/navigation')
  @PlatformRoles(...WRITE_ROLES)
  createNavigation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCapabilityNavigationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityNavigationResponseDto> {
    return this.navigationService.create(id, dto, user);
  }

  @Patch(':id/navigation/:navId')
  @PlatformRoles(...WRITE_ROLES)
  updateNavigation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('navId', ParseUUIDPipe) navId: string,
    @Body() dto: UpdateCapabilityNavigationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityNavigationResponseDto> {
    return this.navigationService.update(id, navId, dto, user);
  }

  @Delete(':id/navigation/:navId')
  @PlatformRoles(...WRITE_ROLES)
  removeNavigation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('navId', ParseUUIDPipe) navId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.navigationService.remove(id, navId, user);
  }

  @Get(':id/config-schemas')
  @PlatformRoles(...READ_ROLES)
  listConfigSchemas(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CapabilityConfigSchemaResponseDto[]> {
    return this.configSchemasService.list(id);
  }

  @Post(':id/config-schemas')
  @PlatformRoles(...WRITE_ROLES)
  createConfigSchema(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCapabilityConfigSchemaDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityConfigSchemaResponseDto> {
    return this.configSchemasService.create(id, dto, user);
  }

  @Patch(':id/config-schemas/:schemaId')
  @PlatformRoles(...WRITE_ROLES)
  updateConfigSchema(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('schemaId', ParseUUIDPipe) schemaId: string,
    @Body() dto: UpdateCapabilityConfigSchemaDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CapabilityConfigSchemaResponseDto> {
    return this.configSchemasService.update(id, schemaId, dto, user);
  }

  @Delete(':id/config-schemas/:schemaId')
  @PlatformRoles(...WRITE_ROLES)
  removeConfigSchema(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('schemaId', ParseUUIDPipe) schemaId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.configSchemasService.remove(id, schemaId, user);
  }
}
