import { Injectable, Logger } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import {
  formatAppointmentDateTime,
  formatContactName,
} from '@app/modules/communications/email/utils/email-variables.util';
import { BusinessRepository } from '@app/modules/platform/business/repositories/business.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { normalizeNotificationSettings } from '@app/modules/platform/membership/permissions/staff-permission.registry';
import type { AppointmentWithRelations } from '../repositories/appointment.repository';

@Injectable()
export class AppointmentNotificationService {
  private readonly logger = new Logger(AppointmentNotificationService.name);

  constructor(
    private readonly emailNotificationService: EmailNotificationService,
    private readonly businessRepository: BusinessRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
  ) {}

  async sendConfirmation(
    businessId: string,
    appointment: AppointmentWithRelations,
    timezone?: string | null,
  ): Promise<void> {
    const contactEmail = appointment.contact?.email?.trim();
    if (!contactEmail) {
      return;
    }

    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId,
      emailType: 'appointment.confirmation',
      toEmail: contactEmail,
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-confirm-${appointment.id}`,
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
      if (!member.user.email) {
        continue;
      }

      void this.emailNotificationService
        .enqueueTransactionalEmail({
          businessId,
          emailType: 'appointment.owner_notification',
          toEmail: member.user.email,
          userId: member.userId,
          entityType: 'Appointment',
          entityId: appointment.id,
          idempotencyKey: `appointment-owner-${appointment.id}-${member.userId}`,
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

      void this.emailNotificationService
        .enqueueTransactionalEmail({
          businessId,
          emailType: 'appointment.owner_notification',
          toEmail: membership.user.email,
          userId: membership.userId,
          entityType: 'Appointment',
          entityId: appointment.id,
          idempotencyKey: `appointment-staff-${event}-${appointment.id}-${membership.userId}`,
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
    const contactEmail = appointment.contact?.email?.trim();
    if (!contactEmail) {
      return;
    }

    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId,
      emailType: 'appointment.cancelled',
      toEmail: contactEmail,
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-cancelled-${appointment.id}`,
      variables,
    });
  }

  async sendRescheduled(
    businessId: string,
    appointment: AppointmentWithRelations,
    previousStartAt: Date,
    timezone?: string | null,
  ): Promise<void> {
    const contactEmail = appointment.contact?.email?.trim();
    if (!contactEmail) {
      return;
    }

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

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId,
      emailType: 'appointment.rescheduled',
      toEmail: contactEmail,
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-rescheduled-${appointment.id}-${appointment.startAt.toISOString()}`,
      variables,
    });
  }

  async sendReady(
    businessId: string,
    appointment: AppointmentWithRelations,
    timezone?: string | null,
  ): Promise<void> {
    const contactEmail = appointment.contact?.email?.trim();
    if (!contactEmail) {
      return;
    }

    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId,
      emailType: 'appointment.ready',
      toEmail: contactEmail,
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-ready-${appointment.id}-${Date.now()}`,
      variables,
    });
  }

  async sendReminder(
    businessId: string,
    appointment: AppointmentWithRelations,
    reminderHoursBefore: number,
    timezone?: string | null,
  ): Promise<void> {
    const contactEmail = appointment.contact?.email?.trim();
    if (!contactEmail) {
      return;
    }

    const business = await this.businessRepository.findById(businessId);
    const variables = this.buildVariables(
      business?.name ?? 'Business',
      appointment,
      timezone,
    );

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId,
      emailType: 'appointment.reminder',
      toEmail: contactEmail,
      contactId: appointment.contactId ?? undefined,
      entityType: 'Appointment',
      entityId: appointment.id,
      idempotencyKey: `appointment-reminder-${appointment.id}-${reminderHoursBefore}h`,
      variables,
    });
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
