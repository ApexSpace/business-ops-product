import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
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

@ApiTags('automations')
@ApiBearerAuth()
@Controller('automations/metadata')
@UseGuards(BusinessRolesGuard)
export class AutomationMetadataController {
  constructor(private readonly metadataService: AutomationMetadataService) {}

  @Get('categories')
  @ApiOkResponse({ type: AutomationCategoryResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listCategories(@Query() query: CategoryScopeQueryDto) {
    return this.metadataService.listCategories(query.scope);
  }

  @Get('triggers')
  @ApiOkResponse({ type: TriggerMetadataResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listTriggers(@Query() query: AutomationMetadataQueryDto) {
    return this.metadataService.listTriggers({
      categoryKeys: query.categoryKeys,
      status: query.status,
      search: query.search,
    });
  }

  @Get('actions')
  @ApiOkResponse({ type: ActionMetadataResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listActions(@Query() query: AutomationMetadataQueryDto) {
    return this.metadataService.listActions({
      categoryKeys: query.categoryKeys,
      status: query.status,
      search: query.search,
    });
  }

  @Get('custom-values')
  @ApiOkResponse({ type: GroupedCustomValuesResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listCustomValues(@Query() query: CustomValuesMetadataQueryDto) {
    return this.metadataService.listCustomValuesGrouped({
      categoryKeys: query.customValueCategoryKeys,
      status: query.status,
      search: query.search,
    });
  }

  @Get('custom-values/flat')
  @ApiOkResponse({ type: CustomValueMetadataResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listCustomValuesFlat(@Query() query: CustomValuesMetadataQueryDto) {
    return this.metadataService.listCustomValues({
      categoryKeys: query.customValueCategoryKeys,
      status: query.status,
      search: query.search,
    });
  }

  @Get('conditions')
  @ApiOkResponse({ type: ConditionMetadataResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listConditions(@Query() query: AutomationMetadataQueryDto) {
    return this.metadataService.listConditions({
      categoryKeys: query.categoryKeys,
      status: query.status,
      search: query.search,
    });
  }

  @Get('filter-operators')
  @ApiOkResponse({ type: FilterOperatorMetadataResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listFilterOperators() {
    return this.metadataService.listFilterOperators();
  }
}
