import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import {
  ActionMetadataResponseDto,
  AutomationCategoryResponseDto,
  AutomationMetadataQueryDto,
  CategoryScopeQueryDto,
  ConditionMetadataResponseDto,
  CustomValueMetadataResponseDto,
  CustomValuesMetadataQueryDto,
  FilterOperatorMetadataResponseDto,
  GroupedCustomValuesResponseDto,
  TriggerMetadataResponseDto,
} from '../dto/automation-metadata.dto';
import { AutomationMetadataService } from '../services/automation-metadata.service';

const PLATFORM_AUDIENCE = 'platform' as const;

@ApiTags('platform-automations')
@ApiBearerAuth()
@Controller('platform/automations/metadata')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
)
export class PlatformAutomationMetadataController {
  constructor(private readonly metadataService: AutomationMetadataService) {}

  @Get('categories')
  @ApiOkResponse({ type: AutomationCategoryResponseDto, isArray: true })
  listCategories(@Query() query: CategoryScopeQueryDto) {
    return this.metadataService.listCategories(query.scope);
  }

  @Get('triggers')
  @ApiOkResponse({ type: TriggerMetadataResponseDto, isArray: true })
  listTriggers(@Query() query: AutomationMetadataQueryDto) {
    return this.metadataService.listTriggers({
      categoryKeys: query.categoryKeys,
      status: query.status,
      search: query.search,
      audience: PLATFORM_AUDIENCE,
    });
  }

  @Get('actions')
  @ApiOkResponse({ type: ActionMetadataResponseDto, isArray: true })
  listActions(@Query() query: AutomationMetadataQueryDto) {
    return this.metadataService.listActions({
      categoryKeys: query.categoryKeys,
      status: query.status,
      search: query.search,
      audience: PLATFORM_AUDIENCE,
    });
  }

  @Get('custom-values')
  @ApiOkResponse({ type: GroupedCustomValuesResponseDto, isArray: true })
  listCustomValues(@Query() query: CustomValuesMetadataQueryDto) {
    return this.metadataService.listCustomValuesGrouped({
      categoryKeys: query.customValueCategoryKeys,
      status: query.status,
      search: query.search,
      audience: PLATFORM_AUDIENCE,
    });
  }

  @Get('custom-values/flat')
  @ApiOkResponse({ type: CustomValueMetadataResponseDto, isArray: true })
  listCustomValuesFlat(@Query() query: CustomValuesMetadataQueryDto) {
    return this.metadataService.listCustomValues({
      categoryKeys: query.customValueCategoryKeys,
      status: query.status,
      search: query.search,
      audience: PLATFORM_AUDIENCE,
    });
  }

  @Get('conditions')
  @ApiOkResponse({ type: ConditionMetadataResponseDto, isArray: true })
  listConditions(@Query() query: AutomationMetadataQueryDto) {
    return this.metadataService.listConditions({
      categoryKeys: query.categoryKeys,
      status: query.status,
      search: query.search,
    });
  }

  @Get('filter-operators')
  @ApiOkResponse({ type: FilterOperatorMetadataResponseDto, isArray: true })
  listFilterOperators() {
    return this.metadataService.listFilterOperators();
  }
}
