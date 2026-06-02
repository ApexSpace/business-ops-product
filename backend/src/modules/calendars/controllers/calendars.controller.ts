import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '../../../common/dto/confirm-delete-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { BusinessRoles } from '../../../common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '../../../common/guards/business-roles.guard';
import {
  AddCalendarStaffDto,
  CreateCalendarDto,
  CreateCalendarExceptionDto,
  ListCalendarsQueryDto,
  ReplaceCalendarAvailabilityDto,
  UpdateCalendarDto,
  UpdateCalendarExceptionDto,
} from '../dto/calendar.dto';
import { CalendarsService } from '../services/calendars.service';

@ApiTags('calendars')
@ApiBearerAuth()
@Controller('calendars')
@UseGuards(BusinessRolesGuard)
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser, @Query() query: ListCalendarsQueryDto) {
    return this.calendarsService.list(user.businessId!, query);
  }

  @Post()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCalendarDto) {
    return this.calendarsService.create(user.businessId!, dto, user);
  }

  @Get(':id/staff')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listStaff(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.calendarsService.listStaff(user.businessId!, id);
  }

  @Post(':id/staff')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  addStaff(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCalendarStaffDto,
  ) {
    return this.calendarsService.addStaff(user.businessId!, id, dto, user);
  }

  @Delete(':id/staff/:userId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  removeStaff(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.calendarsService.removeStaff(
      user.businessId!,
      id,
      userId,
      user,
    );
  }

  @Get(':id/availability')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getAvailability(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.calendarsService.getById(user.businessId!, id).then((c) => c.availability);
  }

  @Put(':id/availability')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  replaceAvailability(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceCalendarAvailabilityDto,
  ) {
    return this.calendarsService.replaceAvailability(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Get(':id/exceptions')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listExceptions(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.calendarsService.listExceptions(user.businessId!, id);
  }

  @Post(':id/exceptions')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createException(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCalendarExceptionDto,
  ) {
    return this.calendarsService.createException(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/exceptions/:exceptionId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateException(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exceptionId', ParseUUIDPipe) exceptionId: string,
    @Body() dto: UpdateCalendarExceptionDto,
  ) {
    return this.calendarsService.updateException(
      user.businessId!,
      id,
      exceptionId,
      dto,
      user,
    );
  }

  @Delete(':id/exceptions/:exceptionId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  removeException(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exceptionId', ParseUUIDPipe) exceptionId: string,
  ) {
    return this.calendarsService.removeException(
      user.businessId!,
      id,
      exceptionId,
      user,
    );
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
    return this.calendarsService.getById(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarDto,
  ) {
    return this.calendarsService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @ApiQuery({ name: 'confirm', required: true, type: Boolean })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.calendarsService.remove(user.businessId!, id, user);
  }
}
