import { HttpStatus, Injectable } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { CancelRescheduleSettingsService } from '@app/modules/operations/appointments/cancel-reschedule-settings/services/cancel-reschedule-settings.service';
import {
  canClientCancel,
  canClientReschedule,
} from '@app/modules/operations/appointments/cancel-reschedule-settings/utils/cancel-reschedule-behavior.util';
import { AppointmentRepository } from '@app/modules/operations/appointments/repositories/appointment.repository';
import { AppointmentNotificationService } from '@app/modules/operations/appointments/services/appointment-notification.service';
import { OnlineBookingSettingsRepository } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import { resolveBookingTimezone } from '@app/modules/operations/online-booking-settings/utils/resolve-booking-timezone.util';
import {
  PublicAppointmentManageAvailabilityQueryDto,
  PublicAppointmentManageSummaryDto,
  PublicAppointmentRescheduleDto,
} from '../dto/public-appointment-manage.dto';
import { PublicBookingDayAvailabilityDto } from '../dto/public-booking.dto';
import { PublicBookingService } from './public-booking.service';
import { PublicBookingAvailabilityQueryDto } from '../dto/public-booking.dto';

function readMetadataRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function staffDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
} | null | undefined): string | null {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email || null;
}

function serviceNameFromAppointment(appointment: {
  service: { name: string } | null;
  serviceLines: Array<{ service: { name: string } | null }>;
}): string | null {
  if (appointment.serviceLines.length > 0) {
    const names = appointment.serviceLines
      .map((line) => line.service?.name)
      .filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  return appointment.service?.name ?? null;
}

@Injectable()
export class PublicAppointmentManageService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly cancelRescheduleSettingsService: CancelRescheduleSettingsService,
    private readonly businessRepository: BusinessRepository,
    private readonly onlineBookingSettingsRepository: OnlineBookingSettingsRepository,
    private readonly publicBookingService: PublicBookingService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly auditService: AuditService,
  ) {}

  async getSummary(token: string): Promise<PublicAppointmentManageSummaryDto> {
    const appointment = await this.requireManageableAppointment(token);
    const business = await this.businessRepository.findById(
      appointment.businessId,
    );
    const [policySettings, behaviorSettings] = await Promise.all([
      this.cancelRescheduleSettingsService.getSettings(appointment.businessId),
      this.cancelRescheduleSettingsService.getBehaviorSettings(
        appointment.businessId,
      ),
    ]);
    const now = new Date();
    const timezone = resolveBookingTimezone(
      null,
      business?.timezone ?? 'UTC',
    );

    return {
      businessName: business?.name ?? 'Business',
      businessPhone: business?.phoneNumber ?? null,
      timezone,
      title: appointment.title,
      serviceName: serviceNameFromAppointment(appointment),
      staffName: staffDisplayName(appointment.assignedTo),
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status,
      canCancel: canClientCancel(behaviorSettings, appointment, now),
      canReschedule: canClientReschedule(behaviorSettings, appointment, now),
      cancellationPolicyHtml: policySettings.cancellationPolicyHtml,
      cancellationPolicySms: policySettings.cancellationPolicySms,
    };
  }

  async cancel(token: string): Promise<{ success: true }> {
    const appointment = await this.requireManageableAppointment(token);
    const settings =
      await this.cancelRescheduleSettingsService.getBehaviorSettings(
        appointment.businessId,
      );

    if (!canClientCancel(settings, appointment)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Self-cancellation is not available for this appointment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const previousMetadata = readMetadataRecord(appointment.metadata);
    const updated = await this.appointmentRepository.update(appointment.id, {
      status: AppointmentStatus.CANCELLED,
      metadata: {
        ...previousMetadata,
        cancellationType: 'normal',
        clientSelfCancelled: true,
      },
    });

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: appointment.businessId,
      action: 'appointment.client_cancelled',
      entityType: 'Appointment',
      entityId: appointment.id,
    });

    void this.appointmentNotificationService
      .sendCancelled(appointment.businessId, updated)
      .catch(() => undefined);
    void this.appointmentNotificationService
      .sendStaffNotifications(appointment.businessId, updated, 'cancelled')
      .catch(() => undefined);

    return { success: true };
  }

  async getAvailability(
    token: string,
    query: PublicAppointmentManageAvailabilityQueryDto,
  ): Promise<PublicBookingDayAvailabilityDto[]> {
    const appointment = await this.requireManageableAppointment(token);
    const settings =
      await this.cancelRescheduleSettingsService.getBehaviorSettings(
        appointment.businessId,
      );

    if (!canClientReschedule(settings, appointment)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Self-rescheduling is not available for this appointment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const slug = await this.resolveBookingSlug(appointment);
    if (!slug) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Online rescheduling is unavailable for this appointment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const serviceId =
      appointment.serviceId ?? appointment.serviceLines[0]?.serviceId;
    if (!serviceId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Appointment has no service to reschedule',
        HttpStatus.BAD_REQUEST,
      );
    }

    const availabilityQuery: PublicBookingAvailabilityQueryDto = {
      from: query.from,
      to: query.to,
      timezone: query.timezone,
      serviceId,
      ...(appointment.assignedToId
        ? { staffId: appointment.assignedToId }
        : {}),
    };

    return this.publicBookingService.getAvailability(slug, availabilityQuery);
  }

  async reschedule(
    token: string,
    dto: PublicAppointmentRescheduleDto,
  ): Promise<{ success: true; startAt: string; endAt: string }> {
    const appointment = await this.requireManageableAppointment(token);
    const settings =
      await this.cancelRescheduleSettingsService.getBehaviorSettings(
        appointment.businessId,
      );

    if (!canClientReschedule(settings, appointment)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Self-rescheduling is not available for this appointment',
        HttpStatus.BAD_REQUEST,
      );
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid appointment time range',
        HttpStatus.BAD_REQUEST,
      );
    }

    const previousStartAt = appointment.startAt;
    let lineStart = startAt;
    const serviceLines = appointment.serviceLines.map((line) => {
      const lineStartAt = lineStart;
      const durationMinutes =
        line.durationMinutes ??
        Math.max(
          1,
          Math.round(
            (appointment.endAt.getTime() - appointment.startAt.getTime()) /
              60_000,
          ),
        );
      lineStart = new Date(lineStart.getTime() + durationMinutes * 60_000);
      return {
        serviceId: line.serviceId,
        assignedToId: line.assignedToId,
        startAt: lineStartAt,
        durationMinutes: line.durationMinutes ?? undefined,
        price: line.price ?? undefined,
        sortOrder: line.sortOrder,
      };
    });

    const updated = await this.appointmentRepository.update(
      appointment.id,
      {
        startAt,
        endAt,
        ...(serviceLines.length > 0 ? {} : {}),
      },
      serviceLines.length > 0 ? serviceLines : undefined,
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: appointment.businessId,
      action: 'appointment.client_rescheduled',
      entityType: 'Appointment',
      entityId: appointment.id,
      metadata: {
        previousStartAt: previousStartAt.toISOString(),
        startAt: startAt.toISOString(),
      },
    });

    void this.appointmentNotificationService
      .sendRescheduled(
        appointment.businessId,
        updated,
        previousStartAt,
      )
      .catch(() => undefined);
    void this.appointmentNotificationService
      .sendStaffNotifications(
        appointment.businessId,
        updated,
        'rescheduled',
        undefined,
        previousStartAt,
      )
      .catch(() => undefined);

    return {
      success: true,
      startAt: updated.startAt.toISOString(),
      endAt: updated.endAt.toISOString(),
    };
  }

  private async requireManageableAppointment(token: string) {
    const appointment =
      await this.appointmentRepository.findByClientManageToken(token);
    if (!appointment) {
      throw new AppException(
        ErrorCode.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.NO_SHOW
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This appointment can no longer be managed',
        HttpStatus.BAD_REQUEST,
      );
    }
    return appointment;
  }

  private async resolveBookingSlug(appointment: {
    businessId: string;
    metadata: Prisma.JsonValue;
  }): Promise<string | null> {
    const metadata = readMetadataRecord(appointment.metadata);
    if (typeof metadata.publicSlug === 'string' && metadata.publicSlug.trim()) {
      return metadata.publicSlug.trim();
    }

    const context =
      await this.onlineBookingSettingsRepository.findBookingContextByBusinessId(
        appointment.businessId,
      );
    return context?.publicSlug ?? null;
  }
}
