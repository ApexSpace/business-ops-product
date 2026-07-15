import {
  Body,
  Controller,
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
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  BookFromWaitlistDto,
  CreateWaitlistEntryDto,
  ListWaitlistQueryDto,
} from '../dto/waitlist.dto';
import { WaitlistService } from '../services/waitlist.service';

@ApiTags('waitlist')
@ApiBearerAuth()
@Controller('waitlist')
@UseGuards(BusinessRolesGuard)
@StaffPermission('appointments.access')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser, @Query() query: ListWaitlistQueryDto) {
    return this.waitlistService.list(user.businessId!, query);
  }

  @Get('summary')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  summary(@CurrentUser() user: RequestUser) {
    return this.waitlistService.getSummary(user.businessId!);
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
    return this.waitlistService.getById(user.businessId!, id);
  }

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_waitlist')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWaitlistEntryDto,
  ) {
    return this.waitlistService.createManual(user.businessId!, dto, user);
  }

  @Patch(':id/dismiss')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_waitlist')
  dismiss(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.waitlistService.dismissMatch(user.businessId!, id, user);
  }

  @Post(':id/book')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_waitlist')
  book(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BookFromWaitlistDto,
  ) {
    return this.waitlistService.bookFromWaitlist(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/cancel')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('appointments.manage_waitlist')
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.waitlistService.cancel(user.businessId!, id, user);
  }
}
