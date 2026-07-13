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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
} from '../dto/appointment.dto';
import { AppointmentsService } from '@app/modules/operations/appointments/services/appointments.service';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('appointments')
@StaffPermission('appointments.access')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListAppointmentsQueryDto,
  ) {
    return this.appointmentsService.list(user.businessId!, query, user);
  }

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_own', 'appointments.manage_all')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user.businessId!, dto, user);
  }

  @Get(':id/activity')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getActivity(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.getActivity(user.businessId!, id);
  }

  @Post(':id/notify')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_own', 'appointments.manage_all')
  notifyClient(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.notifyClient(user.businessId!, id, user);
  }

  @Get(':id/photos')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listPhotos(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.listPhotos(user.businessId!, id);
  }

  @Get(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.getById(user.businessId!, id);
  }

  @Patch(':id/status')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.change_status')
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_own', 'appointments.manage_all')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @ApiQuery({ name: 'confirm', required: true, type: Boolean })
  @StaffPermission('appointments.manage_own', 'appointments.manage_all')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.appointmentsService.remove(user.businessId!, id, user);
  }
}
