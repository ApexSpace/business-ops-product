import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FinancialDueStatusModule } from '@app/modules/finance/shared/financial-due-status.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { SchedulerTasksService } from './scheduler-tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AppointmentsModule,
    FinancialDueStatusModule,
  ],
  providers: [SchedulerTasksService],
})
export class AppSchedulerModule {}
