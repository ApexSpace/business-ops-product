import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { IntegrationProviderWithStatusDto } from './dto/integration.dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(BusinessRolesGuard)
export class IntegrationProvidersController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('providers')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listProviders(
    @CurrentUser() user: RequestUser,
  ): Promise<IntegrationProviderWithStatusDto[]> {
    return this.integrationsService.listBusinessProviders(user.businessId!);
  }
}
