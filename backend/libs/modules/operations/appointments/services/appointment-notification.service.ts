import { Injectable, Logger } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { formatPhone } from '@app/modules/crm/contacts/utils/contact-profile.util';
import {
  formatAppointmentDateTime,
  formatContactName,
} from '@app/modules/communications/email/utils/email-variables.util';
import { NotificationDispatchService } from '@app/modules/communications/notifications/services/notification-dispatch.service';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { normalizeNotificationSettings } from '@app/modules/platform/membership/permissions/staff-permission.registry';
import type { AppointmentWithRelations } from '../repositories/appointment.repository';

@Injectable()
export class AppointmentNotificationService {
  private readonly logger = new Logger(AppointmentNotificationService.name);

  constructor(
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly businessRepository: BusinessRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
  ) {}

  async sendConfirmation(
    businessId: string,
    appointment: AppointmentWithRelations,
    timezone?: string | null,
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    await this.notificationDispatch.dispatch({
      businessId,
      notificationKey: 'appointment.confirmation',
      toEmail: appointment.contact?.email?.trim(),
      toPhone: this.contactPhone(appointment),
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-confirm-${appointment.id}`,
      missingRecipient: 'skip',
      variables,
    });
  }

  async sendOwnerNotifications(
    businessId: string,
    appointment: AppointmentWithRelations,
    timezone?: string | null,
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    const members =
      await this.membershipRepository.findOwnersAndAdmins(businessId);
    for (const member of members) {
      void this.notificationDispatch
        .dispatch({
          businessId,
          notificationKey: 'appointment.owner_notification',
          toEmail: member.user.email,
          toPhone: null,
          userId: member.userId,
          entityType: 'Appointment',
          entityId: appointment.id,
          idempotencyKey: `appointment-owner-${appointment.id}-${member.userId}`,
          missingRecipient: 'skip',
          variables,
        })
        .catch((err) => {
          this.logger.warn(
            `Owner notification failed for appointment ${appointment.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });
    }
  }

  async sendStaffNotifications(
    businessId: string,
    appointment: AppointmentWithRelations,
    event: 'booked' | 'rescheduled' | 'cancelled',
    timezone?: string | null,
    previousStartAt?: Date,
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    const variables = {
      ...this.buildVariables(
        business?.name ?? 'Business',
        appointment,
        timezone,
      ),
      ...(previousStartAt
        ? {
            'appointment.previous_start_at': formatAppointmentDateTime(
              previousStartAt,
              timezone,
            ),
          }
        : {}),
    };

    const settingKey =
      event === 'booked'
        ? 'appointment.booked'
        : event === 'rescheduled'
          ? 'appointment.rescheduled'
          : 'appointment.cancelled';

    const staffUserIds = this.collectStaffUserIds(appointment);

    for (const userId of staffUserIds) {
      const membership =
        await this.membershipRepository.findByUserAndBusinessWithUser(
          userId,
          businessId,
        );
      if (
        !membership?.user.email ||
        !membership.isServiceProvider ||
        membership.status !== MembershipStatus.ACTIVE
      ) {
        continue;
      }

      const settings = normalizeNotificationSettings(
        membership.notificationSettings,
      );
      if (!settings[settingKey]) {
        continue;
      }

      void this.notificationDispatch
        .dispatch({
          businessId,
          notificationKey: 'appointment.owner_notification',
          toEmail: membership.user.email,
          toPhone: null,
          userId: membership.userId,
          entityType: 'Appointment',
          entityId: appointment.id,
          idempotencyKey: `appointment-staff-${event}-${appointment.id}-${membership.userId}`,
          missingRecipient: 'skip',
          variables,
        })
        .catch((err) => {
          this.logger.warn(
            `Staff notification failed for appointment ${appointment.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });
    }
  }

  async sendCancelled(
    businessId: string,
    appointment: AppointmentWithRelations,
    timezone?: string | null,
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    await this.notificationDispatch.dispatch({
      businessId,
      notificationKey: 'appointment.cancelled',
      toEmail: appointment.contact?.email?.trim(),
      toPhone: this.contactPhone(appointment),
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-cancelled-${appointment.id}`,
      missingRecipient: 'skip',
      variables,
    });
  }

  async sendRescheduled(
    businessId: string,
    appointment: AppointmentWithRelations,
    previousStartAt: Date,
    timezone?: string | null,
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    const variables = {
      ...this.buildVariables(
        business?.name ?? 'Business',
        appointment,
        timezone,
      ),
      'appointment.previous_start_at': formatAppointmentDateTime(
        previousStartAt,
        timezone,
      ),
    };

    await this.notificationDispatch.dispatch({
      businessId,
      notificationKey: 'appointment.rescheduled',
      toEmail: appointment.contact?.email?.trim(),
      toPhone: this.contactPhone(appointment),
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-rescheduled-${appointment.id}-${appointment.startAt.toISOString()}`,
      missingRecipient: 'skip',
      variables,
    });
  }

  async sendReady(
    businessId: string,
    appointment: AppointmentWithRelations,
    timezone?: string | null,
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    await this.notificationDispatch.dispatch({
      businessId,
      notificationKey: 'appointment.ready',
      toEmail: appointment.contact?.email?.trim(),
      toPhone: this.contactPhone(appointment),
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-ready-${appointment.id}-${Date.now()}`,
      missingRecipient: 'skip',
      variables,
    });
  }

  async sendReminder(
    businessId: string,
    appointment: AppointmentWithRelations,
    reminderHoursBefore: number,
    timezone?: string | null,
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    await this.notificationDispatch.dispatch({
      businessId,
      notificationKey: 'appointment.reminder',
      toEmail: appointment.contact?.email?.trim(),
      toPhone: this.contactPhone(appointment),
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-reminder-${appointment.id}-${reminderHoursBefore}h`,
      missingRecipient: 'skip',
      variables,
    });
  }

  private contactPhone(
    appointment: AppointmentWithRelations,
  ): string | null {
    return formatPhone(
      appointment.contact?.phoneCountryCode,
      appointment.contact?.phoneNumber,
    );
  }

  private buildVariables(
    businessName: string,
    appointment: AppointmentWithRelations,
    timezone?: string | null,
  ): Record<string, string> {
    return {
      'business.name': businessName,
      'contact.name': appointment.contact
        ? formatContactName(appointment.contact)
        : appointment.title,
      'contact.email': appointment.contact?.email?.trim() ?? '',
      'appointment.start_at': formatAppointmentDateTime(
        appointment.startAt,
        timezone,
      ),
      'appointment.end_at': formatAppointmentDateTime(
        appointment.endAt,
        timezone,
      ),
      'appointment.calendar_name': appointment.calendar?.name ?? 'Appointment',
      'appointment.title': appointment.title,
    };
  }

  private collectStaffUserIds(
    appointment: AppointmentWithRelations,
  ): string[] {
    const ids = new Set<string>();
    if (appointment.assignedToId) {
      ids.add(appointment.assignedToId);
    }
    for (const line of appointment.serviceLines ?? []) {
      if (line.assignedToId) {
        ids.add(line.assignedToId);
      }
    }
    return [...ids];
  }
}
