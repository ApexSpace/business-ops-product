import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppointmentSource, AppointmentStatus, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { normalizeTimezone } from '@app/common/utils/timezone.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { AppointmentRepository } from '@app/modules/operations/appointments/repositories/appointment.repository';
import { CalendarRepository } from '@app/modules/operations/calendars/repositories/calendar.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { ServiceBookingTimingService } from '@app/modules/crm/services/services/service-booking-timing.service';
import { ServiceWorkspaceRepository } from '@app/modules/crm/services/repositories/service-workspace.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import {
  CreatePublicBookingDto,
  PublicBookingAvailabilityQueryDto,
  PublicBookingCalendarDto,
  PublicBookingConfirmationDto,
  PublicBookingDayAvailabilityDto,
} from '../dto/public-booking.dto';
import {
  toPublicBookingCalendar,
  toPublicBookingConfirmation,
} from '../mappers/public-booking.mapper';
import { BookingAvailabilityService } from './booking-availability.service';
import { PublicBookingContactService } from './public-booking-contact.service';
import { isValidBookingSlug } from '../utils/booking-slug.util';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import {
  formatAppointmentDateTime,
  formatContactName,
} from '@app/modules/communications/email/utils/email-variables.util';

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly bookingAvailabilityService: BookingAvailabilityService,
    private readonly publicBookingContactService: PublicBookingContactService,
    private readonly serviceRepository: ServiceRepository,
    private readonly workspaceRepository: ServiceWorkspaceRepository,
    private readonly bookingTimingService: ServiceBookingTimingService,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
    private readonly jobEnqueueService: JobEnqueueService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async getCalendarBySlug(slug: string): Promise<PublicBookingCalendarDto> {
    const calendar = await this.requirePublicCalendar(slug);
    return toPublicBookingCalendar(calendar);
  }

  async getAvailability(
    slug: string,
    query: PublicBookingAvailabilityQueryDto,
  ): Promise<PublicBookingDayAvailabilityDto[]> {
    const calendar = await this.requirePublicCalendar(slug);
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      to < from
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid availability range',
        HttpStatus.BAD_REQUEST,
      );
    }

    const viewerTimezone = normalizeTimezone(
      query.timezone ?? calendar.timezone,
    );

    const timing = await this.bookingTimingService.resolveForBooking({
      businessId: calendar.businessId,
      serviceId: query.serviceId,
      staffId: query.staffId,
      calendar,
    });

    return this.bookingAvailabilityService.getAvailability({
      calendar,
      availability: calendar.availability,
      exceptions: calendar.exceptions,
      from,
      to,
      viewerTimezone,
      staffId: query.staffId,
      timing,
    });
  }

  async createBooking(
    slug: string,
    dto: CreatePublicBookingDto,
    context?: { userAgent?: string; isEmbed?: boolean },
  ): Promise<PublicBookingConfirmationDto> {
    const calendar = await this.requirePublicCalendar(slug);
    const formSettings = toPublicBookingCalendar(calendar).formSettings;

    this.validateBookingForm(dto, formSettings);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid appointment time',
        HttpStatus.BAD_REQUEST,
      );
    }

    const timing = await this.bookingTimingService.resolveForBooking({
      businessId: calendar.businessId,
      serviceId: dto.serviceId,
      staffId: dto.staffId,
      calendar,
    });

    const available = await this.bookingAvailabilityService.isSlotAvailable({
      calendar,
      availability: calendar.availability,
      exceptions: calendar.exceptions,
      startAt,
      endAt,
      staffId: dto.staffId,
      timing,
    });

    if (!available) {
      throw new AppException(
        ErrorCode.BOOKING_SLOT_UNAVAILABLE,
        'This time slot is no longer available',
        HttpStatus.CONFLICT,
      );
    }

    let serviceRecord: Awaited<
      ReturnType<ServiceRepository['findById']>
    > = null;
    if (dto.serviceId) {
      serviceRecord = await this.serviceRepository.findById(
        calendar.businessId,
        dto.serviceId,
      );
      if (!serviceRecord) {
        throw new AppException(
          ErrorCode.SERVICE_NOT_FOUND,
          'Service not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const bookingSettings =
        await this.workspaceRepository.findOnlineBookingSettings(
          calendar.businessId,
          dto.serviceId,
        );
      if (bookingSettings && !bookingSettings.onlineBookingEnabled) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'This service is not available for online booking',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (serviceRecord.requiresNoStaff) {
        const resourceCount =
          await this.workspaceRepository.countResourceRequirements(
            calendar.businessId,
            dto.serviceId,
          );
        if (resourceCount < 1) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'This service is not configured for booking',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (serviceRecord.requiresTwoStaff) {
        if (!dto.staffId || !dto.secondaryStaffId) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Two staff members are required for this service',
            HttpStatus.BAD_REQUEST,
          );
        }
        for (const staffUserId of [dto.staffId, dto.secondaryStaffId]) {
          const assignment = await this.workspaceRepository.findStaffAssignment(
            calendar.businessId,
            dto.serviceId,
            staffUserId,
          );
          if (!assignment?.isEnabled || !assignment.onlineBookingEnabled) {
            throw new AppException(
              ErrorCode.BAD_REQUEST,
              'Selected staff cannot perform this service online',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      } else if (dto.staffId) {
        const assignment = await this.workspaceRepository.findStaffAssignment(
          calendar.businessId,
          dto.serviceId,
          dto.staffId,
        );
        if (
          assignment &&
          (!assignment.isEnabled || !assignment.onlineBookingEnabled)
        ) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Selected staff cannot perform this service online',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }

    let assignedToId: string | null = dto.staffId ?? null;
    if (!serviceRecord?.requiresNoStaff) {
      if (assignedToId) {
        const membership =
          await this.membershipRepository.findActiveByUserAndBusiness(
            assignedToId,
            calendar.businessId,
          );
        if (!membership) {
          throw new AppException(
            ErrorCode.ASSIGNEE_NOT_MEMBER,
            'Staff member not found',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        const primary = calendar.staff.find((s) => s.isPrimary);
        assignedToId = primary?.userId ?? calendar.staff[0]?.userId ?? null;
      }
    } else {
      assignedToId = null;
    }

    const contactSource = context?.isEmbed
      ? 'Calendar Widget'
      : 'Public Booking';

    const contact = await this.publicBookingContactService.resolveOrCreate(
      calendar.businessId,
      {
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        phoneCountryCode: dto.phoneCountryCode,
        phoneNumber: dto.phoneNumber,
        formAnswers: dto.formAnswers,
        source: contactSource,
      },
    );

    const source =
      dto.source ??
      (context?.isEmbed
        ? AppointmentSource.BOOKING_WIDGET
        : AppointmentSource.PUBLIC_LINK);

    const status = calendar.requireApproval
      ? AppointmentStatus.SCHEDULED
      : calendar.autoConfirm
        ? AppointmentStatus.CONFIRMED
        : AppointmentStatus.SCHEDULED;

    const title = `${dto.customerName.trim()} - ${calendar.name}`;

    const productUsages = dto.serviceId
      ? (
          await this.workspaceRepository.findWorkspace(
            calendar.businessId,
            dto.serviceId,
          )
        )?.productUsages.map((p) => p.id) ?? []
      : [];

    const serviceMetadata =
      serviceRecord && timing
        ? this.bookingTimingService.buildAppointmentMetadata({
            timing,
            service: serviceRecord,
            productUsageIds: productUsages,
            secondaryStaffId: dto.secondaryStaffId ?? null,
          })
        : null;

    const appointment = await this.appointmentRepository.create(
      calendar.businessId,
      {
        calendarId: calendar.id,
        contactId: contact.id,
        serviceId: dto.serviceId ?? null,
        assignedToId,
        title,
        startAt,
        endAt,
        status,
        source,
        locationType: calendar.locationType,
        locationValue: calendar.locationValue,
        notes: dto.notes?.trim() || null,
        metadata: {
          publicSlug: slug,
          formAnswers: dto.formAnswers ?? null,
          customerTimezone: dto.timezone,
          userAgent: context?.userAgent ?? null,
          referrer: dto.referrer ?? null,
          ...(serviceMetadata ?? {}),
        } as Prisma.InputJsonValue,
      },
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: calendar.businessId,
      action: 'appointment.public_booked',
      entityType: 'Appointment',
      entityId: appointment.id,
      metadata: { source, publicSlug: slug },
    });

    // TODO: reminder, SMS, WhatsApp

    const startAtFormatted = formatAppointmentDateTime(
      appointment.startAt,
      dto.timezone ?? calendar.timezone,
    );
    const contactName = formatContactName({
      displayName: dto.customerName,
      email: dto.customerEmail,
    });
    const bookingVariables = {
      'business.name': calendar.business.name,
      'contact.name': contactName,
      'contact.email': dto.customerEmail?.trim() ?? '',
      'appointment.start_at': startAtFormatted,
      'appointment.end_at': formatAppointmentDateTime(
        appointment.endAt,
        dto.timezone ?? calendar.timezone,
      ),
      'appointment.calendar_name': calendar.name,
      'appointment.title': appointment.title,
    };

    if (dto.customerEmail?.trim()) {
      void this.emailNotificationService
        .enqueueTransactionalEmail({
          businessId: calendar.businessId,
          emailType: 'appointment.confirmation',
          toEmail: dto.customerEmail.trim(),
          contactId: contact.id,
          entityType: 'Appointment',
          entityId: appointment.id,
          idempotencyKey: `booking-confirm-${appointment.id}`,
          variables: bookingVariables,
        })
        .catch((err) => {
          this.logger.warn(
            `Booking confirmation email enqueue failed for ${appointment.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });
    }

    void this.membershipRepository
      .findOwnersAndAdmins(calendar.businessId)
      .then((members) => {
        for (const member of members) {
          if (!member.user.email) continue;
          void this.emailNotificationService
            .enqueueTransactionalEmail({
              businessId: calendar.businessId,
              emailType: 'appointment.owner_notification',
              toEmail: member.user.email,
              userId: member.userId,
              entityType: 'Appointment',
              entityId: appointment.id,
              idempotencyKey: `booking-owner-${appointment.id}-${member.userId}`,
              variables: bookingVariables,
            })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);

    void this.jobEnqueueService
      .enqueueAppointmentGoogleSync({
        businessId: calendar.businessId,
        appointmentId: appointment.id,
        actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      })
      .catch((err) => {
        this.logger.warn(
          `Google sync enqueue failed for public booking ${appointment.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });

    return toPublicBookingConfirmation({
      appointmentId: appointment.id,
      title: appointment.title,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      timezone: dto.timezone,
      status: appointment.status,
      calendar,
      businessName: calendar.business.name,
    });
  }

  private async requirePublicCalendar(slug: string) {
    if (!isValidBookingSlug(slug)) {
      throw new AppException(
        ErrorCode.CALENDAR_NOT_FOUND,
        'Calendar not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const calendar =
      await this.calendarRepository.findByPublicSlugForBooking(slug);
    if (!calendar) {
      throw new AppException(
        ErrorCode.CALENDAR_NOT_FOUND,
        'Calendar not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!calendar.publicBookingEnabled || calendar.status !== 'ACTIVE') {
      throw new AppException(
        ErrorCode.PUBLIC_BOOKING_DISABLED,
        'Public booking is not available',
        HttpStatus.NOT_FOUND,
      );
    }

    return calendar;
  }

  private validateBookingForm(
    dto: CreatePublicBookingDto,
    formSettings: { requireEmail: boolean; requirePhone: boolean },
  ) {
    if (formSettings.requireEmail && !dto.customerEmail?.trim()) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Email is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      formSettings.requirePhone &&
      (!dto.phoneNumber?.trim() || !dto.phoneCountryCode?.trim())
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Phone number is required',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
