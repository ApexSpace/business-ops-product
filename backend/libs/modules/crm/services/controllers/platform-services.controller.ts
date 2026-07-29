import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { ListServicesQueryDto } from '../dto/list-services-query.dto';
import { ServicesService } from '../services/services.service';

const PLATFORM_SERVICES_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-services')
@ApiBearerAuth()
@Controller('platform/services')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_SERVICES_ROLES)
export class PlatformServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Get()
  async list(@Query() query: ListServicesQueryDto) {
    const businessId = await this.internalBusiness.getId();
    return this.servicesService.list(businessId, query);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.servicesService.getById(businessId, id);
  }
}
