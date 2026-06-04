import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { DEFAULT_WEEKLY_AVAILABILITY } from '../constants/default-availability';
import {
  AddCalendarStaffDto,
  CalendarDetailResponseDto,
  CalendarExceptionResponseDto,
  CalendarResponseDto,
  CalendarStaffResponseDto,
  CreateCalendarDto,
  CreateCalendarExceptionDto,
  ListCalendarsQueryDto,
  ReplaceCalendarAvailabilityDto,
  UpdateCalendarDto,
  UpdateCalendarExceptionDto,
} from '../dto/calendar.dto';
import {
  toAvailabilityResponse,
  toCalendarDetailResponse,
  toCalendarResponse,
  toCalendarStaffResponse,
  toExceptionResponse,
} from '../mappers/calendar.mapper';
import { CalendarRepository } from '../repositories/calendar.repository';

@Injectable()
export class CalendarsService {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    dto: CreateCalendarDto,
    actor: RequestUser,
  ): Promise<CalendarDetailResponseDto> {
    const calendar = await this.calendarRepository.create(businessId, {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      type: dto.type,
      color: dto.color?.trim() || null,
      timezone: dto.timezone?.trim() || 'UTC',
      status: dto.status,
      defaultDurationMinutes: dto.defaultDurationMinutes,
      bufferBeforeMinutes: dto.bufferBeforeMinutes,
      bufferAfterMinutes: dto.bufferAfterMinutes,
      minimumNoticeMinutes: dto.minimumNoticeMinutes,
      maxBookingDays: dto.maxBookingDays,
      slotIntervalMinutes: dto.slotIntervalMinutes,
      locationType: dto.locationType,
      locationValue: dto.locationValue?.trim() || null,
      requireApproval: dto.requireApproval,
      autoConfirm: dto.autoConfirm,
      capacity: dto.capacity,
      formSettings: dto.formSettings as Prisma.InputJsonValue | undefined,
      confirmationSettings: dto.confirmationSettings as Prisma.InputJsonValue | undefined,
      paymentSettings: dto.paymentSettings as Prisma.InputJsonValue | undefined,
      notificationSettings: dto.notificationSettings as Prisma.InputJsonValue | undefined,
      policySettings: dto.policySettings as Prisma.InputJsonValue | undefined,
      widgetSettings: dto.widgetSettings as Prisma.InputJsonValue | undefined,
      googleSyncSettings:
        (dto.googleSyncSettings as Prisma.InputJsonValue | undefined) ??
        ({ syncDirection: 'NONE', enabled: false } as Prisma.InputJsonValue),
      createdById: actor.id,
    });

    await this.calendarRepository.replaceAvailability(
      businessId,
      calendar.id,
      DEFAULT_WEEKLY_AVAILABILITY,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.created',
      entityType: 'Calendar',
      entityId: calendar.id,
    });

    return this.getById(businessId, calendar.id);
  }

  async list(
    businessId: string,
    query: ListCalendarsQueryDto,
  ): Promise<{
    items: CalendarResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.calendarRepository.findMany(
      businessId,
      {
        skip,
        take,
        search: query.search?.trim(),
        status: query.status,
      },
    );
    return {
      items: items.map(toCalendarResponse),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<CalendarDetailResponseDto> {
    const calendar = await this.calendarRepository.findByIdWithRelations(
      businessId,
      id,
    );
    if (!calendar) {
      throw new AppException(
        ErrorCode.CALENDAR_NOT_FOUND,
        'Calendar not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toCalendarDetailResponse(calendar);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateCalendarDto,
    actor: RequestUser,
  ): Promise<CalendarDetailResponseDto> {
    await this.assertCalendar(businessId, id);

    await this.calendarRepository.update(businessId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() || null }
        : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.color !== undefined ? { color: dto.color?.trim() || null } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone.trim() } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.defaultDurationMinutes !== undefined
        ? { defaultDurationMinutes: dto.defaultDurationMinutes }
        : {}),
      ...(dto.bufferBeforeMinutes !== undefined
        ? { bufferBeforeMinutes: dto.bufferBeforeMinutes }
        : {}),
      ...(dto.bufferAfterMinutes !== undefined
        ? { bufferAfterMinutes: dto.bufferAfterMinutes }
        : {}),
      ...(dto.minimumNoticeMinutes !== undefined
        ? { minimumNoticeMinutes: dto.minimumNoticeMinutes }
        : {}),
      ...(dto.maxBookingDays !== undefined
        ? { maxBookingDays: dto.maxBookingDays }
        : {}),
      ...(dto.slotIntervalMinutes !== undefined
        ? { slotIntervalMinutes: dto.slotIntervalMinutes }
        : {}),
      ...(dto.locationType !== undefined ? { locationType: dto.locationType } : {}),
      ...(dto.locationValue !== undefined
        ? { locationValue: dto.locationValue?.trim() || null }
        : {}),
      ...(dto.requireApproval !== undefined
        ? { requireApproval: dto.requireApproval }
        : {}),
      ...(dto.autoConfirm !== undefined ? { autoConfirm: dto.autoConfirm } : {}),
      ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      ...(dto.formSettings !== undefined
        ? { formSettings: dto.formSettings as Prisma.InputJsonValue }
        : {}),
      ...(dto.confirmationSettings !== undefined
        ? { confirmationSettings: dto.confirmationSettings as Prisma.InputJsonValue }
        : {}),
      ...(dto.paymentSettings !== undefined
        ? { paymentSettings: dto.paymentSettings as Prisma.InputJsonValue }
        : {}),
      ...(dto.notificationSettings !== undefined
        ? { notificationSettings: dto.notificationSettings as Prisma.InputJsonValue }
        : {}),
      ...(dto.policySettings !== undefined
        ? { policySettings: dto.policySettings as Prisma.InputJsonValue }
        : {}),
      ...(dto.widgetSettings !== undefined
        ? { widgetSettings: dto.widgetSettings as Prisma.InputJsonValue }
        : {}),
      ...(dto.googleSyncSettings !== undefined
        ? { googleSyncSettings: dto.googleSyncSettings as Prisma.InputJsonValue }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.updated',
      entityType: 'Calendar',
      entityId: id,
    });

    return this.getById(businessId, id);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertCalendar(businessId, id);
    await this.calendarRepository.softDelete(businessId, id);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.deleted',
      entityType: 'Calendar',
      entityId: id,
    });
  }

  async replaceAvailability(
    businessId: string,
    calendarId: string,
    dto: ReplaceCalendarAvailabilityDto,
    actor: RequestUser,
  ) {
    await this.assertCalendar(businessId, calendarId);
    const rows = await this.calendarRepository.replaceAvailability(
      businessId,
      calendarId,
      dto.slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isEnabled: s.isEnabled ?? true,
      })),
    );
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.availability_updated',
      entityType: 'Calendar',
      entityId: calendarId,
    });
    return rows.map(toAvailabilityResponse);
  }

  async listStaff(
    businessId: string,
    calendarId: string,
  ): Promise<CalendarStaffResponseDto[]> {
    await this.assertCalendar(businessId, calendarId);
    const rows = await this.calendarRepository.listStaff(calendarId, businessId);
    return rows.map(toCalendarStaffResponse);
  }

  async addStaff(
    businessId: string,
    calendarId: string,
    dto: AddCalendarStaffDto,
    actor: RequestUser,
  ): Promise<CalendarStaffResponseDto> {
    await this.assertCalendar(businessId, calendarId);
    await this.assertMember(businessId, dto.userId);

    if (dto.isPrimary) {
      await this.calendarRepository.clearPrimaryStaff(calendarId);
    }

    const row = await this.calendarRepository.addStaff({
      businessId,
      calendarId,
      userId: dto.userId,
      role: dto.role?.trim() || null,
      isPrimary: dto.isPrimary ?? false,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.updated',
      entityType: 'Calendar',
      entityId: calendarId,
      metadata: { staffUserId: dto.userId, action: 'staff_added' },
    });

    return toCalendarStaffResponse(row);
  }

  async removeStaff(
    businessId: string,
    calendarId: string,
    userId: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertCalendar(businessId, calendarId);
    await this.calendarRepository.removeStaff(calendarId, userId);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.updated',
      entityType: 'Calendar',
      entityId: calendarId,
      metadata: { staffUserId: userId, action: 'staff_removed' },
    });
  }

  async listExceptions(
    businessId: string,
    calendarId: string,
  ): Promise<CalendarExceptionResponseDto[]> {
    await this.assertCalendar(businessId, calendarId);
    const rows = await this.calendarRepository.listExceptions(
      calendarId,
      businessId,
    );
    return rows.map(toExceptionResponse);
  }

  async createException(
    businessId: string,
    calendarId: string,
    dto: CreateCalendarExceptionDto,
    actor: RequestUser,
  ): Promise<CalendarExceptionResponseDto> {
    await this.assertCalendar(businessId, calendarId);
    const row = await this.calendarRepository.createException({
      businessId,
      calendarId,
      date: new Date(dto.date),
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
      isUnavailable: dto.isUnavailable ?? true,
      reason: dto.reason?.trim() || null,
    });
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.updated',
      entityType: 'Calendar',
      entityId: calendarId,
      metadata: { exceptionId: row.id, action: 'exception_created' },
    });
    return toExceptionResponse(row);
  }

  async updateException(
    businessId: string,
    calendarId: string,
    exceptionId: string,
    dto: UpdateCalendarExceptionDto,
    actor: RequestUser,
  ): Promise<CalendarExceptionResponseDto> {
    await this.assertCalendar(businessId, calendarId);
    const existing = await this.calendarRepository.findException(
      businessId,
      calendarId,
      exceptionId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.CALENDAR_EXCEPTION_NOT_FOUND,
        'Calendar exception not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const row = await this.calendarRepository.updateException(exceptionId, {
      ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
      ...(dto.startTime !== undefined ? { startTime: dto.startTime ?? null } : {}),
      ...(dto.endTime !== undefined ? { endTime: dto.endTime ?? null } : {}),
      ...(dto.isUnavailable !== undefined
        ? { isUnavailable: dto.isUnavailable }
        : {}),
      ...(dto.reason !== undefined ? { reason: dto.reason?.trim() || null } : {}),
    });
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.updated',
      entityType: 'Calendar',
      entityId: calendarId,
      metadata: { exceptionId, action: 'exception_updated' },
    });
    return toExceptionResponse(row);
  }

  async removeException(
    businessId: string,
    calendarId: string,
    exceptionId: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertCalendar(businessId, calendarId);
    const existing = await this.calendarRepository.findException(
      businessId,
      calendarId,
      exceptionId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.CALENDAR_EXCEPTION_NOT_FOUND,
        'Calendar exception not found',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.calendarRepository.deleteException(exceptionId);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'calendar.updated',
      entityType: 'Calendar',
      entityId: calendarId,
      metadata: { exceptionId, action: 'exception_deleted' },
    });
  }

  private async assertCalendar(businessId: string, id: string) {
    const calendar = await this.calendarRepository.findById(businessId, id);
    if (!calendar) {
      throw new AppException(
        ErrorCode.CALENDAR_NOT_FOUND,
        'Calendar not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return calendar;
  }

  private async assertMember(businessId: string, userId: string) {
    const membership =
      await this.membershipRepository.findActiveByUserAndBusiness(
        userId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.ASSIGNEE_NOT_MEMBER,
        'User is not an active member of this business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
