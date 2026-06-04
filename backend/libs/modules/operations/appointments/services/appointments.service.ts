import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { CalendarRepository } from '@app/modules/operations/calendars/repositories/calendar.repository';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { WorkItemRepository } from '@app/modules/operations/work-items/repositories/work-item.repository';
import {
  AppointmentResponseDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
} from '../dto/appointment.dto';
import { toAppointmentResponse } from '../mappers/appointment.mapper';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { AppointmentRepository } from '../repositories/appointment.repository';

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
    private readonly jobEnqueueService: JobEnqueueService,
  ) {}

  private scheduleGoogleCalendarSync(
    businessId: string,
    appointmentId: string,
    actorUserId: string,
    operation: 'sync' | 'delete' = 'sync',
    snapshot?: {
      calendarId: string;
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
        calendarId: snapshot?.calendarId,
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

  async create(
    businessId: string,
    dto: CreateAppointmentDto,
    actor: RequestUser,
  ): Promise<AppointmentResponseDto> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidRange(startAt, endAt);

    await this.assertCalendar(businessId, dto.calendarId);
    await this.assertContact(businessId, dto.contactId);
    if (dto.serviceId) await this.assertService(businessId, dto.serviceId);
    if (dto.workItemId) await this.assertWorkItem(businessId, dto.workItemId);
    if (dto.assignedToId) await this.assertAssignee(businessId, dto.assignedToId);

    const appointment = await this.appointmentRepository.create(businessId, {
      calendarId: dto.calendarId,
      contactId: dto.contactId,
      serviceId: dto.serviceId ?? null,
      workItemId: dto.workItemId ?? null,
      assignedToId: dto.assignedToId ?? null,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      startAt,
      endAt,
      status: dto.status ?? AppointmentStatus.SCHEDULED,
      source: dto.source,
      locationType: dto.locationType ?? null,
      locationValue: dto.locationValue?.trim() || null,
      notes: dto.notes?.trim() || null,
      createdById: actor.id,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.created',
      entityType: 'Appointment',
      entityId: appointment.id,
    });

    this.scheduleGoogleCalendarSync(businessId, appointment.id, actor.id);

    return toAppointmentResponse(appointment);
  }

  async list(
    businessId: string,
    query: ListAppointmentsQueryDto,
  ): Promise<{
    items: AppointmentResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.appointmentRepository.findMany(
      businessId,
      {
        skip,
        take,
        calendarId: query.calendarId,
        contactId: query.contactId,
        serviceId: query.serviceId,
        workItemId: query.workItemId,
        assignedToId: query.assignedToId,
        status: query.status,
        startFrom: query.startFrom ? new Date(query.startFrom) : undefined,
        startTo: query.startTo ? new Date(query.startTo) : undefined,
        search: query.search?.trim(),
      },
    );
    return {
      items: items.map((row) => toAppointmentResponse(row)),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
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
    return toAppointmentResponse(appointment);
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

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    this.assertValidRange(startAt, endAt);

    if (dto.calendarId) await this.assertCalendar(businessId, dto.calendarId);
    if (dto.contactId) await this.assertContact(businessId, dto.contactId);
    if (dto.serviceId) await this.assertService(businessId, dto.serviceId);
    if (dto.workItemId) await this.assertWorkItem(businessId, dto.workItemId);
    if (dto.assignedToId) await this.assertAssignee(businessId, dto.assignedToId);

    const appointment = await this.appointmentRepository.update(id, {
      ...(dto.calendarId !== undefined ? { calendarId: dto.calendarId } : {}),
      ...(dto.contactId !== undefined ? { contactId: dto.contactId } : {}),
      ...(dto.serviceId !== undefined ? { serviceId: dto.serviceId ?? null } : {}),
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
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.locationType !== undefined
        ? { locationType: dto.locationType ?? null }
        : {}),
      ...(dto.locationValue !== undefined
        ? { locationValue: dto.locationValue?.trim() || null }
        : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.updated',
      entityType: 'Appointment',
      entityId: id,
    });

    this.scheduleGoogleCalendarSync(businessId, id, actor.id);

    return toAppointmentResponse(appointment);
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

    const appointment = await this.appointmentRepository.update(id, {
      status: dto.status,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment.status_changed',
      entityType: 'Appointment',
      entityId: id,
      metadata: { from: existing.status, to: dto.status },
    });

    this.scheduleGoogleCalendarSync(businessId, id, actor.id);

    return toAppointmentResponse(appointment);
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
  }

  private async assertContact(businessId: string, contactId: string) {
    const contact = await this.contactRepository.findById(businessId, contactId);
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertService(businessId: string, serviceId: string) {
    const service = await this.serviceRepository.findById(businessId, serviceId);
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
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
