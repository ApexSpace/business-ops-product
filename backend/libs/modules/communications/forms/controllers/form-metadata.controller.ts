import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireCapability } from '@app/common/decorators/require-capability.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  FormFieldCategoryResponseDto,
  FormFieldTypeResponseDto,
  FormMetadataQueryDto,
  FormPaletteCategoryResponseDto,
} from '../dto/form-metadata.dto';
import { FormMetadataService } from '../services/form-metadata.service';

@ApiTags('forms')
@ApiBearerAuth()
@Controller('forms/metadata')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('forms')
@StaffPermission('forms.manage_templates')
export class FormMetadataController {
  constructor(private readonly metadataService: FormMetadataService) {}

  @Get('categories')
  @ApiOkResponse({ type: FormFieldCategoryResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @RequireCapability('forms.list')
  listCategories() {
    return this.metadataService.listCategories();
  }

  @Get('field-types')
  @ApiOkResponse({ type: FormFieldTypeResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @RequireCapability('forms.list')
  listFieldTypes(@Query() query: FormMetadataQueryDto) {
    return this.metadataService.listFieldTypes(this.parseFilter(query));
  }

  @Get('palette')
  @ApiOkResponse({ type: FormPaletteCategoryResponseDto, isArray: true })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @RequireCapability('forms.list')
  listPalette(@Query() query: FormMetadataQueryDto) {
    return this.metadataService.listPalette(this.parseFilter(query));
  }

  private parseFilter(query: FormMetadataQueryDto) {
    const categoryKeys = query.categories
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    return {
      categoryKeys: categoryKeys?.length ? categoryKeys : undefined,
      status: query.status,
      search: query.search,
    };
  }
}
