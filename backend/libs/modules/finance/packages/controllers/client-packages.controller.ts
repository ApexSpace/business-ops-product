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
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  AdjustQuantitiesDto,
  AvailableClientPackagesQueryDto,
  CreateClientPackageDto,
  ListClientPackagesQueryDto,
  TransferPackageDto,
  UpdateExpirationDateDto,
} from '../dto/package.dto';
import { ClientPackagesService } from '../services/client-packages.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('client-packages')
@ApiBearerAuth()
@Controller('client-packages')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('packages')
@StaffPermission('packages.access')
export class ClientPackagesController {
  constructor(private readonly clientPackagesService: ClientPackagesService) {}

  @Get('available')
  @BusinessRoles(...MEMBER_ROLES)
  findAvailable(
    @CurrentUser() user: RequestUser,
    @Query() query: AvailableClientPackagesQueryDto,
  ) {
    return this.clientPackagesService.findAvailableForService(
      user.businessId!,
      query.contactId,
      query.serviceId,
    );
  }

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: ListClientPackagesQueryDto,
  ) {
    return this.clientPackagesService.findAll(user.businessId!, query);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateClientPackageDto,
  ) {
    return this.clientPackagesService.create(user.businessId!, dto, {
      actor: user,
    });
  }

  @Get(':id')
  @BusinessRoles(...MEMBER_ROLES)
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientPackagesService.findOne(user.businessId!, id);
  }

  @Delete(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientPackagesService.remove(user.businessId!, id, user);
  }

  @Post(':id/transfer')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  transfer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferPackageDto,
  ) {
    return this.clientPackagesService.transfer(user.businessId!, id, dto, user);
  }

  @Patch(':id/quantities')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  adjustQuantities(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustQuantitiesDto,
  ) {
    return this.clientPackagesService.adjustQuantities(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/expiration')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  updateExpiration(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpirationDateDto,
  ) {
    return this.clientPackagesService.updateExpirationDate(
      user.businessId!,
      id,
      dto,
      user,
    );
  }
}
