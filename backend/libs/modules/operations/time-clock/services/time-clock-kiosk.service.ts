import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { RootConfig } from '@app/core/config/configuration';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { TimeCardRepository } from '../repositories/time-card.repository';
import { PinBodyDto } from '../dto/pin-body.dto';
import {
  ClockInResponseDto,
  ClockOutResponseDto,
  VerifyPinResponseDto,
} from '../dto/time-clock-response.dto';
import {
  computePaidMinutes,
  formatPaidHoursDisplay,
} from '../utils/paid-hours.util';
import { formatStaffName } from '../utils/staff-name.util';

type PinMatch = {
  userId: string;
  staffName: string;
};

@Injectable()
export class TimeClockKioskService {
  constructor(
    private readonly timeCardRepository: TimeCardRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  async verifyPin(
    businessId: string,
    dto: PinBodyDto,
  ): Promise<VerifyPinResponseDto> {
    const match = await this.resolvePin(businessId, dto.pin);
    const openCard = await this.timeCardRepository.findOpenForUser(
      businessId,
      match.userId,
    );

    return {
      staffId: match.userId,
      staffName: match.staffName,
      isCurrentlyClockedIn: Boolean(openCard),
      clockedInSince: openCard?.clockInTime.toISOString() ?? null,
    };
  }

  async clockIn(
    businessId: string,
    dto: PinBodyDto,
  ): Promise<ClockInResponseDto> {
    const match = await this.resolvePin(businessId, dto.pin);
    const openCard = await this.timeCardRepository.findOpenForUser(
      businessId,
      match.userId,
    );
    if (openCard) {
      throw new AppException(
        ErrorCode.TIMECLOCK_ALREADY_CLOCKED_IN,
        'Already clocked in',
        HttpStatus.BAD_REQUEST,
      );
    }

    const clockInTime = new Date();
    await this.timeCardRepository.create(businessId, {
      userId: match.userId,
      clockInTime,
    });

    return {
      staffName: match.staffName,
      clockInTime: clockInTime.toISOString(),
      message: 'Clocked in successfully',
    };
  }

  async clockOut(
    businessId: string,
    dto: PinBodyDto,
  ): Promise<ClockOutResponseDto> {
    const match = await this.resolvePin(businessId, dto.pin);
    const openCard = await this.timeCardRepository.findOpenForUser(
      businessId,
      match.userId,
    );
    if (!openCard) {
      throw new AppException(
        ErrorCode.TIMECLOCK_NO_ACTIVE_CLOCK_IN,
        'No active clock-in found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const clockOutTime = new Date();
    const paidMinutes = computePaidMinutes(openCard.clockInTime, clockOutTime);
    await this.timeCardRepository.update(businessId, openCard.id, {
      clockOutTime,
      paidMinutes,
    });

    const business = await this.businessRepository.findById(businessId);

    return {
      staffName: match.staffName,
      clockOutTime: clockOutTime.toISOString(),
      paidMinutes,
      paidHoursDisplay: formatPaidHoursDisplay(paidMinutes) ?? '',
      message: 'Clocked out successfully',
    };
  }

  private async resolvePin(businessId: string, pin: string): Promise<PinMatch> {
    const memberships =
      await this.timeCardRepository.findMembershipsWithPins(businessId);
    const rounds = this.configService.get('auth.bcryptRounds', { infer: true });

    for (const membership of memberships) {
      if (!membership.timeclockPin) continue;
      const matches = await bcrypt.compare(pin, membership.timeclockPin);
      if (matches) {
        return {
          userId: membership.userId,
          staffName: formatStaffName(membership.user),
        };
      }
    }

    throw new AppException(
      ErrorCode.TIMECLOCK_INVALID_PIN,
      'Invalid PIN',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
