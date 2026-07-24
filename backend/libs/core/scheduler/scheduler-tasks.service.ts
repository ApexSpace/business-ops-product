import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FinancialDueStatusService } from '@app/modules/finance/shared/services/financial-due-status.service';
import { AppointmentReminderService } from '@app/modules/operations/appointments/services/appointment-reminder.service';
import { ExpressBookingService } from '@app/modules/operations/express-booking/services/express-booking.service';
import { AutomationAppointmentTriggerService } from '@app/modules/communications/automations/services/automation-appointment-trigger.service';
import { ClientPackagesService } from '@app/modules/finance/packages/services/client-packages.service';
import { ClientMembershipsService } from '@app/modules/finance/memberships/services/client-memberships.service';
import { OperationsCampaignService } from '@app/modules/platform/operations/services/operations-campaign.service';
import { StripePlatformBillingReconcileService } from '@app/modules/platform/billing/stripe/services/stripe-platform-billing-reconcile.service';
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
    private readonly expressBookingService: ExpressBookingService,
    private readonly financialDueStatusService: FinancialDueStatusService,
    private readonly automationAppointmentTriggerService: AutomationAppointmentTriggerService,
    private readonly clientPackagesService: ClientPackagesService,
    private readonly clientMembershipsService: ClientMembershipsService,
    private readonly operationsCampaignService: OperationsCampaignService,
    private readonly stripeBillingReconcile: StripePlatformBillingReconcileService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async enqueueWebhookCleanup(): Promise<void> {
    const days = parseInt(process.env.WEBHOOK_EVENT_RETENTION_DAYS ?? '30', 10);
    const jobId = await this.queueService.addFileJob(
      JOB_CLEANUP_WEBHOOK_EVENTS,
      {
        retentionDays: days,
      },
    );
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

  @Cron(CronExpression.EVERY_MINUTE)
  async processExpiredExpressBookings(): Promise<void> {
    try {
      const count = await this.expressBookingService.processExpired();
      if (count > 0) {
        this.logger.log(`Expired ${count} express booking(s)`);
      }
    } catch (error) {
      this.logger.error(
        `Express booking expiry cron failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async softDeleteExpiredCancelledExpressBookings(): Promise<void> {
    try {
      const count =
        await this.expressBookingService.processSoftDeleteExpiredCancelled();
      if (count > 0) {
        this.logger.log(
          `Soft-deleted ${count} expired cancelled express booking(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Express booking soft-delete cron failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processAutomationAppointmentTriggers(): Promise<void> {
    try {
      await this.automationAppointmentTriggerService.processBeforeStartTriggers();
    } catch (error) {
      this.logger.error(
        `Automation appointment trigger cron failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireClientPackages(): Promise<void> {
    try {
      const count = await this.clientPackagesService.expirePackages();
      if (count > 0) {
        this.logger.log(`Expired ${count} client package(s)`);
      }
    } catch (error) {
      this.logger.error(
        `Package expiration cron failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkMembershipServiceExpiry(): Promise<void> {
    try {
      const count = await this.clientMembershipsService.expireUsageRecords();
      if (count > 0) {
        this.logger.log(
          `Processed ${count} expiring membership usage record(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Membership expiry cron failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async enqueueOrphanFileCleanup(): Promise<void> {
    const hours = parseInt(process.env.ORPHAN_FILE_PENDING_HOURS ?? '24', 10);
    const jobId = await this.queueService.addFileJob(JOB_CLEANUP_ORPHAN_FILES, {
      pendingOlderThanHours: hours,
    });
    this.logger.log(
      `Enqueued orphan file cleanup (>${hours}h pending) bullJobId=${jobId ?? 'n/a'}`,
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processEntitlementCampaignsDue(): Promise<void> {
    try {
      const result =
        await this.operationsCampaignService.processDueCampaigns();
      if (result.due > 0 || result.migrated > 0) {
        this.logger.log(
          `Entitlement campaigns: markedDue=${result.due} autoMigrated=${result.migrated}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Entitlement campaign due processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async reconcileStripePlatformBilling(): Promise<void> {
    try {
      const result = await this.stripeBillingReconcile.reconcileAll({
        limit: 500,
      });
      this.logger.log(
        `Stripe billing reconcile checked=${result.checked} corrected=${result.corrected} errors=${result.errors}`,
      );
    } catch (error) {
      this.logger.error(
        `Stripe billing reconcile failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
