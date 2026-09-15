import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  MembershipStatus,
  StaffWorkException,
} from '@prisma/client';
import { parseCalendarDateKey } from '@app/common/utils/timezone.util';
import { getUtcRangeForLocalDay } from '@app/common/utils/timezone.util';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { resolveBookingTimezone } from '../../utils/resolve-booking-timezone.util';
import {
  RemoveNotWorkingApplyResponseDto,
  RemoveNotWorkingDto,
  RemoveNotWorkingPreviewResponseDto,
  SetNotWorkingApplyResponseDto,
  SetNotWorkingDto,
  SetNotWorkingPreviewResponseDto,
} from '../dto/quick-tools.dto';
import { StaffWorkExceptionRepository } from '../../staff-work-exceptions/repositories/staff-work-exception.repository';
import {
  expandInclusiveDateRange,
  resolveInclusiveToDate,
} from '../../staff-work-exceptions/utils/date-range.util';
import { isPartialDayException } from '../../staff-work-exceptions/utils/full-day-exception.util';

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING_COMPLETION,
  AppointmentStatus.UNCONFIRMED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.WAITING,
  AppointmentStatus.IN_SERVICE,
  AppointmentStatus.COMPLETED,
];

type DateRangeContext = {
  fromDate: string;
  toDate: string;
  dates: Date[];
  rangeStart: Date;
  rangeEnd: Date;
};

@Injectable()
export class QuickToolsService {
  constructor(
    private readonly staffWorkExceptionRepository: StaffWorkExceptionRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async previewSetNotWorking(
    businessId: string,
    dto: SetNotWorkingDto,
  ): Promise<SetNotWorkingPreviewResponseDto> {
    const staffUserIds = await this.assertServiceProviders(
      businessId,
      dto.staffUserIds,
    );
    const range = await this.resolveDateRange(
      businessId,
      dto.fromDate,
      dto.toDate,
    );

    const existing = await this.staffWorkExceptionRepository.findByStaffIdsInRange(
      businessId,
      staffUserIds,
      range.dates[0]!,
      range.dates[range.dates.length - 1]!,
    );
    const existingByKey = this.indexExceptions(existing);

    const skipped: SetNotWorkingPreviewResponseDto['skipped'] = [];
    const upsertRows: Array<{ userId: string; date: Date; reason?: string }> =
      [];

    for (const userId of staffUserIds) {
      for (const date of range.dates) {
        const key = this.exceptionKey(userId, date);
        const row = existingByKey.get(key);
        if (row && isPartialDayException(row)) {
          skipped.push({
            userId,
            date: parseCalendarDateKey(date),
            reason: 'partial_day_exists',
          });
          continue;
        }
        upsertRows.push({
          userId,
          date,
          reason: dto.reason,
        });
      }
    }

    const { total, byStaff } = await this.countAppointmentsInRange(
      businessId,
      staffUserIds,
      range.rangeStart,
      range.rangeEnd,
    );

    return {
      daysAffected: range.dates.length,
      exceptionsToCreate: upsertRows.length,
      skipped,
      appointmentCount: total,
      appointmentsByStaff: byStaff,
    };
  }

  async applySetNotWorking(
    businessId: string,
    dto: SetNotWorkingDto,
    actor: RequestUser,
  ): Promise<SetNotWorkingApplyResponseDto> {
    const preview = await this.previewSetNotWorking(businessId, dto);
    const staffUserIds = await this.assertServiceProviders(
      businessId,
      dto.staffUserIds,
    );
    const range = await this.resolveDateRange(
      businessId,
      dto.fromDate,
      dto.toDate,
    );

    const existing = await this.staffWorkExceptionRepository.findByStaffIdsInRange(
      businessId,
      staffUserIds,
      range.dates[0]!,
      range.dates[range.dates.length - 1]!,
    );
    const existingByKey = this.indexExceptions(existing);

    const upsertRows: Array<{ userId: string; date: Date; reason?: string }> =
      [];
    for (const userId of staffUserIds) {
      for (const date of range.dates) {
        const key = this.exceptionKey(userId, date);
        const row = existingByKey.get(key);
        if (row && isPartialDayException(row)) continue;
        upsertRows.push({ userId, date, reason: dto.reason });
      }
    }

    const exceptionsCreated =
      await this.staffWorkExceptionRepository.bulkUpsertFullDayUnavailable(
        businessId,
        upsertRows,
      );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'quick_tools.set_not_working',
      entityType: 'StaffWorkException',
      entityId: businessId,
      metadata: {
        staffUserIds,
        fromDate: range.fromDate,
        toDate: range.toDate,
        daysAffected: range.dates.length,
        exceptionsCreated,
        skippedCount: preview.skipped.length,
      },
    });

    return {
      daysAffected: range.dates.length,
      exceptionsCreated,
      skippedCount: preview.skipped.length,
    };
  }

  async previewRemoveNotWorking(
    businessId: string,
    dto: RemoveNotWorkingDto,
  ): Promise<RemoveNotWorkingPreviewResponseDto> {
    const staffUserIds = await this.assertServiceProviders(
      businessId,
      dto.staffUserIds,
    );
    const range = await this.resolveDateRange(
      businessId,
      dto.fromDate,
      dto.toDate,
    );

    const exceptionsToRemove =
      await this.staffWorkExceptionRepository.countFullDayUnavailableInRange(
        businessId,
        staffUserIds,
        range.dates[0]!,
        range.dates[range.dates.length - 1]!,
      );

    const { total, byStaff } = await this.countAppointmentsInRange(
      businessId,
      staffUserIds,
      range.rangeStart,
      range.rangeEnd,
    );

    return {
      daysAffected: range.dates.length,
      exceptionsToRemove,
      appointmentCount: total,
      appointmentsByStaff: byStaff,
    };
  }

  async applyRemoveNotWorking(
    businessId: string,
    dto: RemoveNotWorkingDto,
    actor: RequestUser,
  ): Promise<RemoveNotWorkingApplyResponseDto> {
    const staffUserIds = await this.assertServiceProviders(
      businessId,
      dto.staffUserIds,
    );
    const range = await this.resolveDateRange(
      businessId,
      dto.fromDate,
      dto.toDate,
    );

    const exceptionsRemoved =
      await this.staffWorkExceptionRepository.bulkDeleteFullDayUnavailable(
        businessId,
        staffUserIds,
        range.dates[0]!,
        range.dates[range.dates.length - 1]!,
      );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'quick_tools.remove_not_working',
      entityType: 'StaffWorkException',
      entityId: businessId,
      metadata: {
        staffUserIds,
        fromDate: range.fromDate,
        toDate: range.toDate,
        daysAffected: range.dates.length,
        exceptionsRemoved,
      },
    });

    return {
      daysAffected: range.dates.length,
      exceptionsRemoved,
    };
  }

  private async assertServiceProviders(
    businessId: string,
    staffUserIds: string[],
  ): Promise<string[]> {
    const uniqueIds = [...new Set(staffUserIds)];
    for (const userId of uniqueIds) {
      const membership =
        await this.membershipRepository.findActiveByUserAndBusiness(
          userId,
          businessId,
        );
      if (!membership) {
        throw new AppException(
          ErrorCode.ASSIGNEE_NOT_MEMBER,
          `Staff member ${userId} is not an active member of this business`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!membership.isServiceProvider) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          `User ${userId} is not a service provider`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (membership.status !== MembershipStatus.ACTIVE) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          `User ${userId} is not an active staff member`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return uniqueIds;
  }

  private async resolveDateRange(
    businessId: string,
    fromDate: string,
    toDateInput?: string | null,
  ): Promise<DateRangeContext> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const timezone = resolveBookingTimezone(null, business.timezone);
    const toDate = resolveInclusiveToDate(fromDate, toDateInput);

    let dates: Date[];
    try {
      dates = expandInclusiveDateRange(fromDate, toDate, timezone);
    } catch (err) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        err instanceof Error ? err.message : 'Invalid date range',
        HttpStatus.BAD_REQUEST,
      );
    }

    const firstDay = dates[0]!;
    const lastDay = dates[dates.length - 1]!;
    const { start: rangeStart } = getUtcRangeForLocalDay(firstDay, timezone);
    const { end: rangeEnd } = getUtcRangeForLocalDay(lastDay, timezone);

    return { fromDate, toDate, dates, rangeStart, rangeEnd };
  }

  private async countAppointmentsInRange(
    businessId: string,
    staffUserIds: string[],
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<{
    total: number;
    byStaff: Array<{ userId: string; count: number }>;
  }> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
        OR: [
          { assignedToId: { in: staffUserIds } },
          {
            serviceLines: {
              some: { assignedToId: { in: staffUserIds } },
            },
          },
        ],
      },
      select: {
        assignedToId: true,
        serviceLines: { select: { assignedToId: true } },
      },
    });

    const counts = new Map<string, number>();
    for (const userId of staffUserIds) {
      counts.set(userId, 0);
    }

    for (const appt of appointments) {
      const matched = new Set<string>();
      if (appt.assignedToId && staffUserIds.includes(appt.assignedToId)) {
        matched.add(appt.assignedToId);
      }
      for (const line of appt.serviceLines) {
        if (line.assignedToId && staffUserIds.includes(line.assignedToId)) {
          matched.add(line.assignedToId);
        }
      }
      for (const userId of matched) {
        counts.set(userId, (counts.get(userId) ?? 0) + 1);
      }
    }

    const byStaff = staffUserIds.map((userId) => ({
      userId,
      count: counts.get(userId) ?? 0,
    }));
    const total = appointments.length;

    return { total, byStaff };
  }

  private indexExceptions(
    rows: StaffWorkException[],
  ): Map<string, StaffWorkException> {
    const map = new Map<string, StaffWorkException>();
    for (const row of rows) {
      map.set(this.exceptionKey(row.userId, row.date), row);
    }
    return map;
  }

  private exceptionKey(userId: string, date: Date): string {
    return `${userId}:${parseCalendarDateKey(date)}`;
  }
}
