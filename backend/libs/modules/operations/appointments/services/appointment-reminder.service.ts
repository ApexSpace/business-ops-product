import { Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  DEFAULT_REMINDER_HOURS_BEFORE,
  parseCalendarNotificationSettings,
} from '../utils/calendar-notification-settings.util';
import { AppointmentNotificationService } from './appointment-notification.service';

const REMINDER_CRON_WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
  ) {}

  async processDueReminders(): Promise<void> {
    const now = new Date();
    const maxLookAheadHours = 48;
    const lookAheadEnd = new Date(
      now.getTime() + maxLookAheadHours * 60 * 60 * 1000,
    );

    const appointments = await this.prisma.appointment.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        startAt: {
          gt: now,
          lte: lookAheadEnd,
        },
        contact: {
          email: { not: null },
        },
      },
      include: {
        calendar: {
          select: {
            id: true,
            name: true,
            color: true,
            timezone: true,
            notificationSettings: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
        service: { select: { id: true, name: true } },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    let sent = 0;

    for (const appointment of appointments) {
      const settings = parseCalendarNotificationSettings(
        appointment.calendar.notificationSettings,
      );

      if (settings.reminderEnabled === false) {
        continue;
      }

      const reminderHours =
        settings.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE;
      const reminderTarget = new Date(
        appointment.startAt.getTime() - reminderHours * 60 * 60 * 1000,
      );

      if (
        now < reminderTarget ||
        now >= new Date(reminderTarget.getTime() + REMINDER_CRON_WINDOW_MS)
      ) {
        continue;
      }

      try {
        await this.appointmentNotificationService.sendReminder(
          appointment.businessId,
          appointment,
          reminderHours,
          appointment.calendar.timezone,
        );
        sent += 1;
      } catch (error) {
        this.logger.warn(
          `Reminder enqueue failed for appointment ${appointment.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Enqueued ${sent} appointment reminder email(s)`);
    }
  }
}
