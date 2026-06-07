import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FinancialDueStatusService } from '@app/modules/finance/shared/services/financial-due-status.service';
import { AppointmentReminderService } from '@app/modules/operations/appointments/services/appointment-reminder.service';
import {
  JOB_CLEANUP_ASYNC_JOBS,
  JOB_CLEANUP_ORPHAN_FILES,
  JOB_CLEANUP_WEBHOOK_EVENTS,
} from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class SchedulerTasksService {
  private readonly logger = new Logger(SchedulerTasksService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly appointmentReminderService: AppointmentReminderService,
    private readonly financialDueStatusService: FinancialDueStatusService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async enqueueWebhookCleanup(): Promise<void> {
    const days = parseInt(process.env.WEBHOOK_EVENT_RETENTION_DAYS ?? '30', 10);
    const jobId = await this.queueService.addFileJob(JOB_CLEANUP_WEBHOOK_EVENTS, {
      retentionDays: days,
    });
    this.logger.log(
      `Enqueued webhook cleanup (retention ${days}d) bullJobId=${jobId ?? 'n/a'}`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async enqueueAsyncJobCleanup(): Promise<void> {
    const days = parseInt(process.env.ASYNC_JOB_RETENTION_DAYS ?? '90', 10);
    const jobId = await this.queueService.addFileJob(JOB_CLEANUP_ASYNC_JOBS, {
      retentionDays: days,
    });
    this.logger.log(
      `Enqueued async job cleanup (retention ${days}d) bullJobId=${jobId ?? 'n/a'}`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async syncFinancialDueStatuses(): Promise<void> {
    try {
      await this.financialDueStatusService.syncDueStatuses();
    } catch (error) {
      this.logger.error(
        `Financial due status cron failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processAppointmentReminders(): Promise<void> {
    try {
      await this.appointmentReminderService.processDueReminders();
    } catch (error) {
      this.logger.error(
        `Appointment reminder cron failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async enqueueOrphanFileCleanup(): Promise<void> {
    const hours = parseInt(
      process.env.ORPHAN_FILE_PENDING_HOURS ?? '24',
      10,
    );
    const jobId = await this.queueService.addFileJob(JOB_CLEANUP_ORPHAN_FILES, {
      pendingOlderThanHours: hours,
    });
    this.logger.log(
      `Enqueued orphan file cleanup (>${hours}h pending) bullJobId=${jobId ?? 'n/a'}`,
    );
  }
}
