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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { CreateStaffMemberDto } from '../dto/create-staff-member.dto';
import { ListMembersQueryDto } from '../dto/list-members-query.dto';
import { SetTimeClockPinDto } from '../dto/set-time-clock-pin.dto';
import { UpdateStaffMemberProfileDto } from '../dto/update-staff-member-profile.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import {
  ReplaceStaffMemberServicesDto,
  UpdateMemberDetailsDto,
  UpdateMemberNotificationsDto,
  UpdateMemberPermissionsDto,
  UpdateStaffCompensationDto,
} from '../dto/staff-member-settings.dto';
import { MembershipService } from '@app/modules/platform/membership/services/membership.service';

@ApiTags('business')
@ApiBearerAuth()
@Controller('businesses/current/members')
@UseGuards(BusinessRolesGuard)
export class BusinessMembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  list(@CurrentUser() user: RequestUser, @Query() query: ListMembersQueryDto) {
    return this.membershipService.listForBusiness(user.businessId!, query);
  }

  @Post('invite')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  invite(@CurrentUser() user: RequestUser, @Body() dto: InviteMemberDto) {
    return this.membershipService.invite(user.businessId!, dto, user);
  }

  @Post(':userId/resend-invite')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  resendInvite(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.resendInvite(user.businessId!, userId, user);
  }

  @Post()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createStaff(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateStaffMemberDto,
  ) {
    return this.membershipService.createStaffMember(
      user.businessId!,
      dto,
      user,
    );
  }

  @Get(':userId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  getMember(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.getMember(user.businessId!, userId);
  }

  @Patch(':userId/details')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateDetails(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDetailsDto,
  ) {
    return this.membershipService.updateMemberDetails(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Get(':userId/permissions')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  getPermissions(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.getMemberPermissions(user.businessId!, userId);
  }

  @Patch(':userId/permissions')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updatePermissions(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberPermissionsDto,
  ) {
    return this.membershipService.updateMemberPermissions(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Get(':userId/notifications')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  getNotifications(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.getMemberNotifications(
      user.businessId!,
      userId,
    );
  }

  @Patch(':userId/notifications')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateNotifications(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberNotificationsDto,
  ) {
    return this.membershipService.updateMemberNotifications(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Get(':userId/compensation')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  getCompensation(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.getMemberCompensation(
      user.businessId!,
      userId,
    );
  }

  @Patch(':userId/compensation')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateCompensation(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateStaffCompensationDto,
  ) {
    return this.membershipService.updateMemberCompensation(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Get(':userId/services')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  getServices(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.getMemberServices(user.businessId!, userId);
  }

  @Put(':userId/services')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  replaceServices(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ReplaceStaffMemberServicesDto,
  ) {
    return this.membershipService.replaceMemberServices(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Patch(':userId/staff-profile')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateStaffProfile(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateStaffMemberProfileDto,
  ) {
    return this.membershipService.updateStaffProfile(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Patch(':userId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membershipService.updateMember(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Post(':userId/archive')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  archive(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.archiveMember(user.businessId!, userId, user);
  }

  @Delete(':userId')
  @BusinessRoles(BusinessMemberRole.OWNER)
  remove(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.removeMember(user.businessId!, userId, user);
  }

  @Patch(':userId/time-clock-pin')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  setTimeClockPin(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetTimeClockPinDto,
  ) {
    return this.membershipService.setTimeClockPin(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Delete(':userId/time-clock-pin')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  removeTimeClockPin(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.removeTimeClockPin(
      user.businessId!,
      userId,
      user,
    );
  }
}
