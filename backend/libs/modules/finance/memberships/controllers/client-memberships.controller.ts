import {
  Body,
  Controller,
  Get,
  Header,
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
  CreateClientMembershipDto,
  ListClientMembershipsQueryDto,
  RedeemMembershipServiceDto,
  UpdateClientMembershipDto,
} from '../dto/membership.dto';
import { ClientMembershipsService } from '../services/client-memberships.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('client-memberships')
@ApiBearerAuth()
@Controller('memberships/client-memberships')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('payments')
@StaffPermission('memberships.access')
export class ClientMembershipsController {
  constructor(
    private readonly clientMembershipsService: ClientMembershipsService,
  ) {}

  @Get('export')
  @BusinessRoles(...MEMBER_ROLES)
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="client-memberships.csv"',
  )
  exportMemberships(
    @CurrentUser() user: RequestUser,
    @Query() query: ListClientMembershipsQueryDto,
  ) {
    return this.clientMembershipsService.exportClientMemberships(
      user.businessId!,
      query,
    );
  }

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  listClientMemberships(
    @CurrentUser() user: RequestUser,
    @Query() query: ListClientMembershipsQueryDto,
  ) {
    return this.clientMembershipsService.listClientMemberships(
      user.businessId!,
      query,
    );
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  assignMembership(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateClientMembershipDto,
  ) {
    return this.clientMembershipsService.assignMembership(
      user.businessId!,
      dto,
      user,
    );
  }

  @Get('available-for-service')
  @BusinessRoles(...MEMBER_ROLES)
  findAvailableForService(
    @CurrentUser() user: RequestUser,
    @Query('contactId', ParseUUIDPipe) contactId: string,
    @Query('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.clientMembershipsService.findAvailableForService(
      user.businessId!,
      contactId,
      serviceId,
    );
  }

  @Get('discounts')
  @BusinessRoles(...MEMBER_ROLES)
  getMemberDiscounts(
    @CurrentUser() user: RequestUser,
    @Query('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.clientMembershipsService.applyMemberDiscountAtCheckout(
      user.businessId!,
      contactId,
    );
  }

  @Get(':id')
  @BusinessRoles(...MEMBER_ROLES)
  getClientMembership(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientMembershipsService.getClientMembership(
      user.businessId!,
      id,
    );
  }

  @Patch(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  updateClientMembership(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientMembershipDto,
  ) {
    return this.clientMembershipsService.updateClientMembership(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Post(':id/redeem')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('memberships.manage')
  redeemService(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RedeemMembershipServiceDto,
  ) {
    return this.clientMembershipsService.redeemServiceAtCheckout(
      user.businessId!,
      id,
      dto,
    );
  }
}
