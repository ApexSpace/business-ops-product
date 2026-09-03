import { HttpStatus, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { AppointmentStatus, AppointmentSource, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { AuditLogRepository } from '@app/modules/platform/audit/repositories/audit-log.repository';
import { CalendarRepository } from '@app/modules/operations/calendars/repositories/calendar.repository';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { WorkItemRepository } from '@app/modules/operations/work-items/repositories/work-item.repository';
import {
  AppointmentActivityItemDto,
  AppointmentResponseDto,
  AppointmentServiceLineInputDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
} from '../dto/appointment.dto';
import { toAppointmentResponse } from '../mappers/appointment.mapper';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { ClientPackagesService } from '@app/modules/finance/packages/services/client-packages.service';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { AppointmentNotificationService } from './appointment-notification.service';
import { resolveServiceTiming } from '@app/modules/crm/services/utils/service-timing.util';
import {
  appointmentBlocksOverlap,
  resolveAppointmentBlockingWindow,
} from '../utils/appointment-blocking.util';
import { formatStaffScheduleConflictMessage } from '../utils/format-appointment-schedule-message.util';
import { WorkingHoursService } from '@app/modules/operations/online-booking-settings/services/working-hours.service';
import { WaitlistMatchingService } from '@app/modules/operations/waitlist/services/waitlist-matching.service';
import { StorageService } from '@app/modules/storage/services/storage.service';
import { canViewAllStaffCalendars } from '@app/modules/platform/membership/permissions/staff-permission.registry';
import {
  assertCanChangeAppointmentStatus,
  assertCanMutateAppointment,
  assertCanViewAppointment,
  assertCanViewAppointmentHistory,
  isBusinessAdminRole,
} from '../utils/appointment-staff-access.util';
import { hasStaffPermission } from '@app/modules/platform/membership/permissions/staff-permission.registry';
import { applyContactSummaryPrivacy } from '@app/modules/crm/contacts/utils/contact-privacy.util';
import { DateTime } from 'luxon';
import { WaitingRoomSettingsService } from '../waiting-room-settings/services/waiting-room-settings.service';
import { CancelRescheduleSettingsService } from '../cancel-reschedule-settings/services/cancel-reschedule-settings.service';
import { AppointmentAutomatedMessagesService } from '../automated-messages/services/appointment-automated-messages.service';
import { matchingImmediateNotificationKeys } from '../automated-messages/utils/message-resolver.util';
import { classifyStaffCancellation } from '../cancel-reschedule-settings/utils/cancel-reschedule-behavior.util';
import { buildAppointmentManageFields } from '../utils/appointment-manage-token.util';
import {
  canNotifyWaitingClient,
  canTransitionToWaiting,
} from '../waiting-room-settings/utils/waiting-room-gate.util';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly contactRepository: ContactRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly workItemRepository: WorkItemRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly jobEnqueueService: JobEnqueueService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly clientPackagesService: ClientPackagesService,
    private readonly workingHoursService: WorkingHoursService,
    @Inject(forwardRef(() => WaitlistMatchingService))
    private readonly waitlistMatchingService: WaitlistMatchingService,
    private readonly storageService: StorageService,
    private readonly waitingRoomSettingsService: WaitingRoomSettingsService,
    private readonly cancelRescheduleSettingsService: CancelRescheduleSettingsService,
    private readonly appointmentAutomatedMessagesService: AppointmentAutomatedMessagesService,
  ) {}

  private scheduleGoogleCalendarSync(
    businessId: string,
    appointmentId: string,
    actorUserId: string,
    operation: 'sync' | 'delete' = 'sync',
    snapshot?: {
      calendarId?: string | null;
      externalEventId: string | null;
      externalProvider: string | null;
    },
  ): void {
    void this.jobEnqueueService
      .enqueueAppointmentGoogleSync({
        businessId,
        appointmentId,
        actorUserId,
        operation,
        calendarId: snapshot?.calendarId ?? undefined,
        externalEventId: snapshot?.externalEventId,
        externalProvider: snapshot?.externalProvider,
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to enqueue Google calendar ${operation} for appointment ${appointmentId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
  }

  private scheduleWaitlistRecheck(
    businessId: string,
    appointment: {
      assignedToId?: string | null;
      startAt: Date;
      serviceLines?: Array<{ assignedToId?: string | null }>;
    },
  ): void {
    const staffIds = new Set<string>();
    if (appointment.assignedToId) {
      staffIds.add(appointment.assignedToId);
    }
    for (const line of appointment.serviceLines ?? []) {
      if (line.assignedToId) staffIds.add(line.assignedToId);
    }

    const dateKey = DateTime.fromJSDate(appointment.startAt, {
      zone: 'utc',
    }).toISODate();
    if (!dateKey) return;

    const run = async () => {
      if (staffIds.size === 0) {
        await this.waitlistMatchingService.recheckOnCalendarMutation({
          businessId,
          dateKey,
        });
        return;
      }
      for (const staffId of staffIds) {
        await this.waitlistMatchingService.recheckOnCalendarMutation({
          businessId,
          staffId,
          dateKey,
        });
      }
    };

    void run().catch((err) => {
      this.logger.warn(
        `Failed waitlist recheck for business ${businessId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  private parseStatusFilter(status?: string): AppointmentStatus[] | undefined {
    if (!status?.trim()) return undefined;
    const parts = status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as AppointmentStatus[];
    return parts.length ? parts : undefined;
  }

  private async detectScheduleConflicts(
    businessId: string,
    _calendarId: string | null | undefined,
    serviceLines: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[],
    _calendarBuffers: {
      bufferBeforeMinutes: number;
      bufferAfterMinutes: number;
    },
    excludeAppointmentId?: string,
  ): Promise<string | null> {
    const timezone =
      await this.workingHoursService.resolveAppointmentTimezone(businessId);
    const warnings: string[] = [];

    for (const line of serviceLines) {
      const staffId = line.assignedToId;
      if (!staffId || !line.startAt) continue;

      const lineStart =
        line.startAt instanceof Date ? line.startAt : new Date(line.startAt);

      const service = await this.serviceRepository.findById(
        businessId,
        line.serviceId,
      );
      if (!service) continue;

      const timing = resolveServiceTiming({
        durationMinutes: service.durationMinutes,
        hasProcessingTime: service.hasProcessingTime,
        processingDurationMinutes: service.processingDurationMinutes,
        finishDurationMinutes: service.finishDurationMinutes,
        hasBufferTime: service.hasBufferTime,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
      });

      const occupancyMinutes =
        line.durationMinutes ?? timing.clientOccupancyMinutes;
      const lineEnd = new Date(lineStart.getTime() + occupancyMinutes * 60_000);
      const candidate = resolveAppointmentBlockingWindow(
        { startAt: lineStart, endAt: lineEnd },
        {
          bufferBeforeMinutes: timing.bufferBeforeMinutes,
          bufferAfterMinutes: timing.bufferAfterMinutes,
        },
      );

      const conflicts =
        await this.appointmentRepository.findStaffBlockingInRange(
          businessId,
          null,
          candidate.blockStart,
          candidate.blockEnd,
          staffId,
          excludeAppointmentId,
        );

      const overlapping = conflicts.filter((existing) =>
        appointmentBlocksOverlap(
          resolveAppointmentBlockingWindow(existing),
          candidate,
        ),
      );

      if (overlapping.length > 0) {
        const first = overlapping[0];
        warnings.push(
          formatStaffScheduleConflictMessage(
            first.startAt,
            first.endAt,
            timezone,
          ),
        );
      }
    }

    return warnings.length > 0 ? warnings.join('; ') : null;
  }

  private resolveServiceLineEndAt(
    line: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput,
    lineStart: Date,
  ): Date {
    if (line.durationMinutes && line.durationMinutes > 0) {
      return new Date(lineStart.getTime() + line.durationMinutes * 60_000);
    }
    return lineStart;
  }

  private async detectOutsideWorkingHours(
    businessId: string,
    serviceLines: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[],
    timezone: string,
    fallbackAssignedToId?: string | null,
  ): Promise<string | null> {
    const warnings: string[] = [];

    for (const line of serviceLines) {
      const staffId = line.assignedToId ?? fallbackAssignedToId;
      if (!staffId || !line.startAt) continue;

      const lineStart =
        line.startAt instanceof Date ? line.startAt : new Date(line.startAt);
      const lineEnd = this.resolveServiceLineEndAt(line, lineStart);

      const startLocal = DateTime.fromJSDate(lineStart, {
        zone: 'utc',
      }).setZone(timezone);
      const endLocal = DateTime.fromJSDate(lineEnd, { zone: 'utc' }).setZone(
        timezone,
      );
      const dateKey = startLocal.toISODate()!;
      const startMinutes = startLocal.hour * 60 + startLocal.minute;
      const endMinutes = endLocal.hour * 60 + endLocal.minute;

      const result =
        await this.workingHoursService.isAppointmentOutsideWorkingHours({
          businessId,
          staffUserId: staffId,
          dateKey,
          startMinutes,
          endMinutes: Math.max(endMinutes, startMinutes + 1),
          timezone,
        });

      if (result.outside && result.label && !warnings.includes(result.label)) {
        warnings.push(result.label);
      }
    }

    return warnings.length > 0 ? warnings.join(' ') : null;
  }

  private async buildServiceLines(
    businessId: string,
    appointmentStart: Date,
    appointmentEnd: Date,
    assignedToId: string | null | undefined,
    lines: AppointmentServiceLineInputDto[] | undefined,
    legacyServiceId?: string,
  ): Promise<{
    serviceLines: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[];
    primaryServiceId: string | null;
    endAt: Date;
  }> {
    const inputLines =
      lines && lines.length > 0
        ? lines
        : legacyServiceId
          ? [{ serviceId: legacyServiceId }]
          : [];

    if (inputLines.length === 0) {
      return {
        serviceLines: [],
        primaryServiceId: null,
        endAt: appointmentEnd,
      };
    }

    let cursor = appointmentStart;
    const serviceLines: Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[] =
      [];

    for (let i = 0; i < inputLines.length; i++) {
      const line = inputLines[i];
      const service = await this.serviceRepository.findById(
        businessId,
        line.serviceId,
      );
      if (!service) {
        throw new AppException(
          ErrorCode.SERVICE_NOT_FOUND,
          'Service not found',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (line.assignedToId) {
        await this.assertAssignee(businessId, line.assignedToId);
      } else if (assignedToId) {
        await this.assertAssignee(businessId, assignedToId);
      }

      const lineStart = line.startAt
        ? new Date(line.startAt)
        : new Date(cursor);
      const duration = line.durationMinutes ?? service.durationMinutes ?? 60;
      cursor = new Date(lineStart.getTime() + duration * 60_000);

      serviceLines.push({
        serviceId: line.serviceId,
        assignedToId: line.assignedToId ?? assignedToId ?? null,
        startAt: lineStart,
        durationMinutes: duration,
        price: line.price != null ? line.price : service.price,
        sortOrder: i,
      });
    }

    return {
      serviceLines,
      primaryServiceId: inputLines[0].serviceId,
      endAt: cursor > appointmentEnd ? cursor : appointmentEnd,
    };
  }

  async create(
    businessId: string,
    dto: CreateAppointmentDto,
    actor: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const startAt = new Date(dto.startAt);
    let endAt = new Date(dto.endAt);
    const isTimeBlock = dto.isTimeBlock === true;

    assertCanMutateAppointment(
      actor,
      {
        assignedToId: dto.assignedToId ?? null,
        createdById: actor.id,
        metadata: isTimeBlock ? { kind: 'TIME_BLOCK' } : undefined,
        serviceLines: (dto.services ?? []).map((line) => ({
          assignedToId: line.assignedToId ?? dto.assignedToId ?? null,
        })),
      },
      { isTimeBlock },
    );

    const calendar = dto.calendarId
      ? await this.assertCalendar(businessId, dto.calendarId)
      : null;
    if (!isTimeBlock) {
      if (!dto.contactId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Contact is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.assertContact(businessId, dto.contactId);
    }
    if (dto.workItemId) await this.assertWorkItem(businessId, dto.workItemId);
    if (dto.assignedToId)
      await this.assertAssignee(businessId, dto.assignedToId);

    const {
      serviceLines,
      primaryServiceId,
      endAt: computedEnd,
    } = isTimeBlock
      ? { serviceLines: [], primaryServiceId: null, endAt }
      : await this.buildServiceLines(
          businessId,
          startAt,
          endAt,
          dto.assignedToId,
          dto.services,
          dto.serviceId,
        );
    endAt = computedEnd;
    this.assertValidRange(startAt, endAt);

    const scheduleTimezone =
      await this.workingHoursService.resolveAppointmentTimezone(businessId);

    const conflictWarning =
      serviceLines.length > 0
        ? await this.detectScheduleConflicts(
            businessId,
            dto.calendarId,
            serviceLines,
            {
              bufferBeforeMinutes: calendar?.bufferBeforeMinutes ?? 0,
              bufferAfterMinutes: calendar?.bufferAfterMinutes ?? 0,
            },
          )
        : null;

    if (conflictWarning) {
      throw new AppException(
        ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
        conflictWarning,
        HttpStatus.CONFLICT,
      );
    }

    const outsideHoursWarning =
      serviceLines.length > 0
        ? await this.detectOutsideWorkingHours(
            businessId,
            serviceLines,
            scheduleTimezone,
            dto.assignedToId,
          )
        : null;

    const scheduleWarning = outsideHoursWarning ?? null;

    const bookedSettings =
      await this.appointmentAutomatedMessagesService.ensureBookedSettings(
        businessId,
      );
    const bookedDefaultStatus =
      bookedSettings.defaultStatus ?? AppointmentStatus.CONFIRMED;

    const resolvedStatus = outsideHoursWarning
      ? AppointmentStatus.UNCONFIRMED
      : (dto.status ?? bookedDefaultStatus);

    const appointment = await this.appointmentRepository.create(
      businessId,
      {
        calendarId: dto.calendarId ?? null,
        contactId: dto.contactId ?? null,
        serviceId: primaryServiceId,
        workItemId: dto.workItemId ?? null,
        assignedToId: dto.assignedToId ?? null,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        startAt,
        endAt,
        status: resolvedStatus,
        source: dto.source,
        locationType: dto.locationType ?? null,
        locationValue: dto.locationValue?.trim() || null,
        notes: dto.notes?.trim() || null,
        metadata: isTimeBlock ? { kind: 'TIME_BLOCK' } : undefined,
        createdById: actor.id,
        ...buildAppointmentManageFields({
          source: dto.source ?? AppointmentSource.INTERNAL,
          isTimeBlock,
        }),
      },
      serviceLines,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.created',
      entityType: 'Appointment',
      entityId: appointment.id,
    });

    this.scheduleGoogleCalendarSync(businessId, appointment.id, actor.id);

    void this.appointmentNotificationService
      .sendOwnerNotifications(businessId, appointment)
      .catch(() => undefined);
    void this.appointmentNotificationService
      .sendStaffNotifications(businessId, appointment, 'booked')
      .catch(() => undefined);

    if (
      dto.sendConfirmation !== false &&
      !isTimeBlock &&
      dto.contactId
    ) {
      const keys = matchingImmediateNotificationKeys(
        bookedSettings.triggers,
        appointment.source,
      );
      if (keys.includes('appointment.confirmation')) {
        void this.appointmentNotificationService
          .sendConfirmation(businessId, appointment)
          .catch(() => undefined);
      }
    }

    const redeemServiceId = primaryServiceId ?? dto.serviceId;
    if (dto.clientPackageId && redeemServiceId) {
      const pkg = await this.clientPackagesService.findOne(
        businessId,
        dto.clientPackageId,
      );
      if (pkg.contact.id !== dto.contactId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Package does not belong to this contact',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.clientPackagesService.redeemService(
        businessId,
        dto.clientPackageId,
        redeemServiceId,
        actor.id,
      );
    }

    this.scheduleWaitlistRecheck(businessId, appointment);

    return this.toResponse(appointment, actor, { scheduleWarning });
  }

  async list(
    businessId: string,
    query: ListAppointmentsQueryDto,
    user?: RequestUser,
  ): Promise<{
    items: AppointmentResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const canViewAllCalendars = canViewAllStaffCalendars(
      user?.staffPermissions,
      user?.businessRole,
    );
    const assignedToId = canViewAllCalendars
      ? query.assignedToId
      : user?.id;

    const { items, total } = await this.appointmentRepository.findMany(
      businessId,
      {
        skip,
        take,
        calendarId: query.calendarId,
        contactId: query.contactId,
        serviceId: query.serviceId,
        workItemId: query.workItemId,
        assignedToId,
        statuses: this.parseStatusFilter(query.status),
        startFrom: query.startFrom ? new Date(query.startFrom) : undefined,
        startTo: query.startTo ? new Date(query.startTo) : undefined,
        search: query.search?.trim(),
      },
    );
    return {
      items: items.map((row) => this.toResponse(row, user)),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
    user?: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentRepository.findById(
      businessId,
      id,
    );
    if (!appointment) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    assertCanViewAppointment(user, appointment);
    const response = this.toResponse(appointment, user);
    const canViewHistory =
      !user ||
      isBusinessAdminRole(user.businessRole) ||
      hasStaffPermission(
        user.staffPermissions,
        'appointments.view_history',
        user.businessRole,
      );
    if (!canViewHistory) {
      response.createdBy = null;
    }
    return response;
  }

  async listPhotos(
    businessId: string,
    id: string,
    user?: RequestUser,
  ): Promise<{
    items: Array<{
      id: string;
      filename: string;
      mimeType: string;
      size: number;
      downloadUrl: string;
      expiresIn: number;
    }>;
  }> {
    const appointment = await this.appointmentRepository.findById(
      businessId,
      id,
    );
    if (!appointment) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    assertCanViewAppointment(user, appointment);

    const metadata =
      appointment.metadata && typeof appointment.metadata === 'object'
        ? (appointment.metadata as Record<string, unknown>)
        : {};
    const photoFileIds = Array.isArray(metadata.photoFileIds)
      ? (metadata.photoFileIds as unknown[]).filter(
          (fileId): fileId is string => typeof fileId === 'string',
        )
      : [];

    const items = [];
    for (const fileId of photoFileIds) {
      try {
        const file = await this.storageService.getFile(businessId, fileId);
        const download = await this.storageService.getDownloadUrl(
          businessId,
          fileId,
        );
        items.push({
          id: file.id,
          filename: file.filename,
          mimeType: file.mimeType,
          size: file.size,
          downloadUrl: download.downloadUrl,
          expiresIn: download.expiresIn,
        });
      } catch {
        this.logger.warn(
          `Skipping missing booking photo ${fileId} on appointment ${id}`,
        );
      }
    }

    return { items };
  }

  async getActivity(
    businessId: string,
    id: string,
    user?: RequestUser,
  ): Promise<{ items: AppointmentActivityItemDto[] }> {
    assertCanViewAppointmentHistory(user);
    const appointment = await this.appointmentRepository.findById(
      businessId,
      id,
    );
    if (!appointment) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    assertCanViewAppointment(user, appointment);

    const logs = await this.auditLogRepository.findByEntity(
      businessId,
      'Appointment',
      id,
      50,
    );

    return {
      items: logs.map((log) => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        actor: log.actor,
        metadata:
          log.metadata && typeof log.metadata === 'object'
            ? (log.metadata as Record<string, unknown>)
            : null,
      })),
    };
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateAppointmentDto,
    actor: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const existing = await this.appointmentRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const nextAssignedToId =
      dto.assignedToId !== undefined ? dto.assignedToId : existing.assignedToId;
    assertCanMutateAppointment(actor, existing);
    assertCanMutateAppointment(actor, {
      ...existing,
      assignedToId: nextAssignedToId,
      serviceLines:
        dto.services?.map((line) => ({
          assignedToId: line.assignedToId ?? nextAssignedToId,
        })) ?? existing.serviceLines,
    });

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    let endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    const scheduleChanged =
      startAt.getTime() !== existing.startAt.getTime() ||
      endAt.getTime() !== existing.endAt.getTime();
    const previousStartAt = existing.startAt;

    if (dto.calendarId) await this.assertCalendar(businessId, dto.calendarId);
    const calendarId =
      dto.calendarId !== undefined ? dto.calendarId : existing.calendarId;
    const calendar = calendarId
      ? await this.calendarRepository.findById(businessId, calendarId)
      : null;
    if (dto.contactId) await this.assertContact(businessId, dto.contactId);
    if (dto.workItemId) await this.assertWorkItem(businessId, dto.workItemId);
    if (dto.assignedToId)
      await this.assertAssignee(businessId, dto.assignedToId);

    const assignedToId =
      dto.assignedToId !== undefined ? dto.assignedToId : existing.assignedToId;

    let serviceLines:
      | Prisma.AppointmentServiceLineUncheckedCreateWithoutAppointmentInput[]
      | undefined;
    let primaryServiceId: string | null | undefined;

    if (dto.services !== undefined || dto.serviceId !== undefined) {
      const built = await this.buildServiceLines(
        businessId,
        startAt,
        endAt,
        assignedToId,
        dto.services,
        dto.serviceId ?? existing.serviceId ?? undefined,
      );
      serviceLines = built.serviceLines;
      primaryServiceId = built.primaryServiceId;
      endAt = built.endAt;
    }

    this.assertValidRange(startAt, endAt);

    const linesForConflict =
      serviceLines ??
      existing.serviceLines.map((line) => ({
        serviceId: line.serviceId,
        assignedToId: line.assignedToId,
        startAt: line.startAt,
        durationMinutes: line.durationMinutes,
        price: line.price,
        sortOrder: line.sortOrder,
      }));

    const scheduleTimezone =
      await this.workingHoursService.resolveAppointmentTimezone(businessId);

    const conflictWarning =
      linesForConflict.length > 0
        ? await this.detectScheduleConflicts(
            businessId,
            calendarId,
            linesForConflict,
            {
              bufferBeforeMinutes: calendar?.bufferBeforeMinutes ?? 0,
              bufferAfterMinutes: calendar?.bufferAfterMinutes ?? 0,
            },
            id,
          )
        : null;

    if (conflictWarning) {
      throw new AppException(
        ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
        conflictWarning,
        HttpStatus.CONFLICT,
      );
    }

    const outsideHoursWarning =
      linesForConflict.length > 0
        ? await this.detectOutsideWorkingHours(
            businessId,
            linesForConflict,
            scheduleTimezone,
            assignedToId,
          )
        : null;

    const scheduleWarning = outsideHoursWarning ?? null;

    const resolvedStatus =
      outsideHoursWarning && dto.status === undefined
        ? AppointmentStatus.UNCONFIRMED
        : dto.status;

    const appointment = await this.appointmentRepository.update(
      id,
      {
        ...(dto.calendarId !== undefined ? { calendarId: dto.calendarId } : {}),
        ...(dto.contactId !== undefined
          ? { contactId: dto.contactId ?? null }
          : {}),
        ...(primaryServiceId !== undefined
          ? { serviceId: primaryServiceId }
          : dto.serviceId !== undefined
            ? { serviceId: dto.serviceId ?? null }
            : {}),
        ...(dto.workItemId !== undefined
          ? { workItemId: dto.workItemId ?? null }
          : {}),
        ...(dto.assignedToId !== undefined
          ? { assignedToId: dto.assignedToId ?? null }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        startAt,
        endAt,
        ...(resolvedStatus !== undefined ? { status: resolvedStatus } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.locationType !== undefined
          ? { locationType: dto.locationType ?? null }
          : {}),
        ...(dto.locationValue !== undefined
          ? { locationValue: dto.locationValue?.trim() || null }
          : {}),
        ...(dto.notes !== undefined
          ? { notes: dto.notes?.trim() || null }
          : {}),
      },
      serviceLines,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.updated',
      entityType: 'Appointment',
      entityId: id,
    });

    this.scheduleGoogleCalendarSync(businessId, id, actor.id);

    if (scheduleChanged && dto.sendConfirmation !== false) {
      void this.appointmentNotificationService
        .sendRescheduled(businessId, appointment, previousStartAt)
        .catch(() => undefined);
      void this.appointmentNotificationService
        .sendStaffNotifications(
          businessId,
          appointment,
          'rescheduled',
          undefined,
          previousStartAt,
        )
        .catch(() => undefined);
    }

    this.scheduleWaitlistRecheck(businessId, existing);
    if (scheduleChanged) {
      this.scheduleWaitlistRecheck(businessId, appointment);
    }

    return this.toResponse(appointment, actor, { scheduleWarning });
  }

  async updateStatus(
    businessId: string,
    id: string,
    dto: UpdateAppointmentStatusDto,
    actor: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const existing = await this.appointmentRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    assertCanChangeAppointmentStatus(actor, existing, dto.status);

    if (dto.status === AppointmentStatus.WAITING) {
      const waitingStatusEnabled =
        await this.waitingRoomSettingsService.isWaitingStatusEnabled(
          businessId,
        );
      if (!canTransitionToWaiting(waitingStatusEnabled)) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Waiting status is disabled for this business',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    let updateData: Prisma.AppointmentUpdateInput = {
      status: dto.status,
    };

    if (
      dto.status === AppointmentStatus.CANCELLED &&
      existing.status !== AppointmentStatus.CANCELLED
    ) {
      const behaviorSettings =
        await this.cancelRescheduleSettingsService.getBehaviorSettings(
          businessId,
        );
      const cancellationType = classifyStaffCancellation(
        behaviorSettings,
        existing,
        new Date(),
      );
      const previousMetadata =
        existing.metadata && typeof existing.metadata === 'object'
          ? (existing.metadata as Record<string, unknown>)
          : {};
      updateData = {
        status: dto.status,
        metadata: {
          ...previousMetadata,
          cancellationType,
          lateCancellation: cancellationType === 'late',
        },
      };
    }

    const appointment = await this.appointmentRepository.update(id, updateData);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.status_changed',
      entityType: 'Appointment',
      entityId: id,
      metadata: { from: existing.status, to: dto.status },
    });

    this.scheduleGoogleCalendarSync(businessId, id, actor.id);

    if (
      dto.status === AppointmentStatus.CANCELLED &&
      existing.status !== AppointmentStatus.CANCELLED
    ) {
      void this.appointmentNotificationService
        .sendCancelled(businessId, appointment)
        .catch(() => undefined);
      void this.appointmentNotificationService
        .sendStaffNotifications(businessId, appointment, 'cancelled')
        .catch(() => undefined);
    }

    this.scheduleWaitlistRecheck(businessId, existing);

    return this.toResponse(appointment, actor);
  }

  async notifyClient(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const existing = await this.appointmentRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    assertCanMutateAppointment(actor, existing);
    if (existing.status !== AppointmentStatus.WAITING) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Client can only be notified while appointment is in waiting status',
        HttpStatus.BAD_REQUEST,
      );
    }

    const waitingStatusEnabled =
      await this.waitingRoomSettingsService.isWaitingStatusEnabled(businessId);
    if (
      !canNotifyWaitingClient(waitingStatusEnabled, existing.status)
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Waiting status is disabled for this business',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!existing.contact?.email?.trim() && !existing.contact?.phoneNumber?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Client has no email or phone number on file',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.appointmentNotificationService.sendReady(businessId, existing);

    const previousMetadata =
      existing.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const waitingNotifiedAt = new Date().toISOString();

    const appointment = await this.appointmentRepository.update(id, {
      metadata: {
        ...previousMetadata,
        waitingNotifiedAt,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.client_notified',
      entityType: 'Appointment',
      entityId: id,
    });

    return this.toResponse(appointment, actor);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<void> {
    const existing = await this.appointmentRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    assertCanMutateAppointment(actor, existing);
    this.scheduleGoogleCalendarSync(businessId, id, actor.id, 'delete', {
      calendarId: existing.calendarId,
      externalEventId: existing.externalEventId,
      externalProvider: existing.externalProvider,
    });
    await this.appointmentRepository.softDelete(id);
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.deleted',
      entityType: 'Appointment',
      entityId: id,
    });

    this.scheduleWaitlistRecheck(businessId, existing);
  }

  private assertValidRange(startAt: Date, endAt: Date) {
    if (endAt <= startAt) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'End time must be after start time',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private toResponse(
    row: Parameters<typeof toAppointmentResponse>[0],
    user?: RequestUser,
    options?: Parameters<typeof toAppointmentResponse>[1],
  ): AppointmentResponseDto {
    const response = toAppointmentResponse(row, options);
    if (!response.contact) return response;
    return {
      ...response,
      contact: applyContactSummaryPrivacy(response.contact, user),
    };
  }

  private async assertCalendar(businessId: string, calendarId: string) {
    const calendar = await this.calendarRepository.findById(
      businessId,
      calendarId,
    );
    if (!calendar) {
      throw new AppException(
        ErrorCode.CALENDAR_NOT_FOUND,
        'Calendar not found',
        HttpStatus.BAD_REQUEST,
      );
    }
    return calendar;
  }

  private async assertContact(businessId: string, contactId: string) {
    const contact = await this.contactRepository.findById(
      businessId,
      contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertWorkItem(businessId: string, workItemId: string) {
    const workItem = await this.workItemRepository.findById(
      businessId,
      workItemId,
    );
    if (!workItem) {
      throw new AppException(
        ErrorCode.WORK_ITEM_NOT_FOUND,
        'Work item not found',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertAssignee(businessId: string, userId: string) {
    const membership =
      await this.membershipRepository.findActiveByUserAndBusiness(
        userId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.ASSIGNEE_NOT_MEMBER,
        'Assignee is not an active member of this business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
