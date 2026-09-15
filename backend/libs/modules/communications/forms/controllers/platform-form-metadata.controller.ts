import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import {
  FormFieldCategoryResponseDto,
  FormFieldTypeResponseDto,
  FormMetadataQueryDto,
  FormPaletteCategoryResponseDto,
} from '../dto/form-metadata.dto';
import { FormMetadataService } from '../services/form-metadata.service';

@ApiTags('platform-forms')
@ApiBearerAuth()
@Controller('platform/forms/metadata')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
)
export class PlatformFormMetadataController {
  constructor(private readonly metadataService: FormMetadataService) {}

  @Get('categories')
  @ApiOkResponse({ type: FormFieldCategoryResponseDto, isArray: true })
  listCategories() {
    return this.metadataService.listCategories();
  }

  @Get('field-types')
  @ApiOkResponse({ type: FormFieldTypeResponseDto, isArray: true })
  listFieldTypes(@Query() query: FormMetadataQueryDto) {
    return this.metadataService.listFieldTypes(this.parseFilter(query));
  }

  @Get('palette')
  @ApiOkResponse({ type: FormPaletteCategoryResponseDto, isArray: true })
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
