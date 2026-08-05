import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FinancialDueStatusModule } from '@app/modules/finance/shared/financial-due-status.module';
import { PackagesModule } from '@app/modules/finance/packages/packages.module';
import { MembershipsModule } from '@app/modules/finance/memberships/memberships.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { ExpressBookingModule } from '@app/modules/operations/express-booking/express-booking.module';
import { AutomationsWorkerModule } from '@app/modules/communications/automations/automations-worker.module';
import { SocialPlannerWorkerModule } from '@app/modules/communications/social-planner/social-planner-worker.module';
import { OperationsModule } from '@app/modules/platform/operations/operations.module';
import { StripePlatformBillingModule } from '@app/modules/platform/billing/stripe/stripe-platform-billing.module';
import { SchedulerTasksService } from './scheduler-tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AppointmentsModule,
    ExpressBookingModule,
    FinancialDueStatusModule,
    PackagesModule,
    MembershipsModule,
    AutomationsWorkerModule,
    SocialPlannerWorkerModule,
    OperationsModule,
    StripePlatformBillingModule,
  ],
  providers: [SchedulerTasksService],
})
export class AppSchedulerModule {}
