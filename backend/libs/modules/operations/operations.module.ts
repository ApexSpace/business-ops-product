import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { CalendarsModule } from './calendars/calendars.module';
import { OnlineBookingSettingsModule } from './online-booking-settings/online-booking-settings.module';
import { PublicBookingModule } from './public-booking/public-booking.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { ResourcesModule } from './resources/resources.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeClockModule } from './time-clock/time-clock.module';
import { WorkItemsModule } from './work-items/work-items.module';

@Module({
  imports: [
    TasksModule,
    AppointmentsModule,
    CalendarsModule,
    OnlineBookingSettingsModule,
    PublicBookingModule,
    WaitlistModule,
    WorkItemsModule,
    ResourcesModule,
    TimeClockModule,
  ],
})
export class OperationsModule {}
