import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { ListGlobalSearchQueryDto } from '../dto/list-global-search-query.dto';
import { GlobalSearchResponseDto } from '../dto/global-search-response.dto';
import { BusinessGlobalSearchService } from '../services/business-global-search.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(BusinessRolesGuard)
export class BusinessSearchController {
  constructor(
    private readonly globalSearchService: BusinessGlobalSearchService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  search(
    @CurrentUser() user: RequestUser,
    @Query() query: ListGlobalSearchQueryDto,
  ): Promise<GlobalSearchResponseDto> {
    return this.globalSearchService.search(
      user.businessId!,
      query.q,
      query.limit ?? 20,
    );
  }
}
