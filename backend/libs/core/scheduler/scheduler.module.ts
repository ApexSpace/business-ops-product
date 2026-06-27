import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FinancialDueStatusModule } from '@app/modules/finance/shared/financial-due-status.module';
import { PackagesModule } from '@app/modules/finance/packages/packages.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { AutomationsWorkerModule } from '@app/modules/communications/automations/automations-worker.module';
import { SchedulerTasksService } from './scheduler-tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AppointmentsModule,
    FinancialDueStatusModule,
    PackagesModule,
    AutomationsWorkerModule,
  ],
  providers: [SchedulerTasksService],
})
export class AppSchedulerModule {}
