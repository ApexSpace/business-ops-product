import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { CalendarsModule } from './calendars/calendars.module';
import { PublicBookingModule } from './public-booking/public-booking.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkItemsModule } from './work-items/work-items.module';

@Module({
  imports: [
    TasksModule,
    AppointmentsModule,
    CalendarsModule,
    PublicBookingModule,
    WorkItemsModule,
  ],
})
export class OperationsModule {}
