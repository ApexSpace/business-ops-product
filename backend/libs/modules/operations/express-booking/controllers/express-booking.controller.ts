import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { CreateExpressAppointmentDto } from '../dto/express-booking.dto';
import { ExpressBookingService } from '../services/express-booking.service';

@ApiTags('express-booking')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('appointments')
@StaffPermission('appointments.access')
export class ExpressBookingController {
  constructor(private readonly expressBookingService: ExpressBookingService) {}

  @Post('express')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_own', 'appointments.manage_all')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateExpressAppointmentDto,
  ) {
    return this.expressBookingService.create(user.businessId!, dto, user);
  }

  @Post(':id/express/resend')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_own', 'appointments.manage_all')
  resend(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expressBookingService.resend(user.businessId!, id, user);
  }

  @Post(':id/express/staff-complete')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_own', 'appointments.manage_all')
  staffComplete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expressBookingService.staffComplete(user.businessId!, id, user);
  }
}
