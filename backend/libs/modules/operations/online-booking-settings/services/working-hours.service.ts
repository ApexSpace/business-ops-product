import { Injectable } from '@nestjs/common';
import { BusinessHours } from '@prisma/client';
import { resolveBusinessTimezone } from '@app/common/utils/timezone.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { OnlineBookingSettingsRepository } from '../repositories/online-booking-settings.repository';
import { normalizeBusinessHoursSlots } from '../utils/business-hours.util';
import {
  dayOfWeekForDateKey,
  getWorkingWindowForDay,
  isRangeOutsideWorkingWindow,
  resolveEffectiveWeeklyHours,
} from '../utils/effective-working-hours.util';

@Injectable()
export class WorkingHoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsRepository: OnlineBookingSettingsRepository,
  ) {}

  async resolveTimezone(businessId: string): Promise<string> {
    return this.resolveAppointmentTimezone(businessId);
  }

  async resolveAppointmentTimezone(businessId: string): Promise<string> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    return resolveBusinessTimezone(business?.timezone);
  }

  async isAppointmentOutsideWorkingHours(params: {
    businessId: string;
    staffUserId: string | null | undefined;
    dateKey: string;
    startMinutes: number;
    endMinutes: number;
    timezone?: string;
  }): Promise<{ outside: boolean; label: string | null }> {
    if (!params.staffUserId) {
      return { outside: false, label: null };
    }

    const timezone =
      params.timezone ?? (await this.resolveTimezone(params.businessId));
    const businessHours = await this.loadBusinessHours(params.businessId);
    const staffSchedules = await this.settingsRepository.findStaffSchedules(
      params.businessId,
      params.staffUserId,
    );
    const weekly = resolveEffectiveWeeklyHours(
      businessHours,
      staffSchedules.length ? staffSchedules : undefined,
    );
    const dayOfWeek = dayOfWeekForDateKey(params.dateKey, timezone);
    const window = getWorkingWindowForDay(weekly, dayOfWeek);
    const outside = isRangeOutsideWorkingWindow(
      params.startMinutes,
      params.endMinutes,
      window,
    );

    if (!outside) {
      return { outside: false, label: null };
    }

    const member = await this.prisma.businessMembership.findFirst({
      where: {
        businessId: params.businessId,
        userId: params.staffUserId,
        deletedAt: null,
      },
      select: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    const name =
      [member?.user.firstName, member?.user.lastName]
        .filter(Boolean)
        .join(' ') ||
      member?.user.email ||
      'this staff member';

    return {
      outside: true,
      label: `Appointment is outside ${name}'s schedule.`,
    };
  }

  private async loadBusinessHours(
    businessId: string,
  ): Promise<BusinessHours[]> {
    const rows = await this.prisma.businessHours.findMany({
      where: { businessId },
    });
    return normalizeBusinessHoursSlots(rows).map((slot, index) => ({
      id:
        rows.find((row) => row.dayOfWeek === slot.dayOfWeek)?.id ??
        `default-${index}`,
      businessId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isEnabled: slot.isEnabled,
      createdAt: rows[0]?.createdAt ?? new Date(),
      updatedAt: rows[0]?.updatedAt ?? new Date(),
    }));
  }
}
