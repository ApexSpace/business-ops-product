import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { PinBodyDto } from '../dto/pin-body.dto';
import {
  ClockInResponseDto,
  ClockOutResponseDto,
  VerifyPinResponseDto,
} from '../dto/time-clock-response.dto';
import { TimeClockKioskService } from '../services/time-clock-kiosk.service';

@ApiTags('time-clock')
@ApiBearerAuth()
@Controller('time-clock')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('time_clock')
@StaffPermission('time_clock.access')
export class TimeClockController {
  constructor(private readonly timeClockKioskService: TimeClockKioskService) {}

  @Post('verify-pin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  verifyPin(
    @CurrentUser() user: RequestUser,
    @Body() dto: PinBodyDto,
  ): Promise<VerifyPinResponseDto> {
    return this.timeClockKioskService.verifyPin(user.businessId!, dto);
  }

  @Post('clock-in')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  clockIn(
    @CurrentUser() user: RequestUser,
    @Body() dto: PinBodyDto,
  ): Promise<ClockInResponseDto> {
    return this.timeClockKioskService.clockIn(user.businessId!, dto);
  }

  @Post('clock-out')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  clockOut(
    @CurrentUser() user: RequestUser,
    @Body() dto: PinBodyDto,
  ): Promise<ClockOutResponseDto> {
    return this.timeClockKioskService.clockOut(user.businessId!, dto);
  }
}
