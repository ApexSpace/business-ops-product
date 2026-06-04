import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { CalendarsModule } from './calendars/calendars.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkItemsModule } from './work-items/work-items.module';

@Module({
  imports: [TasksModule, AppointmentsModule, CalendarsModule, WorkItemsModule],
})
export class OperationsModule {}
