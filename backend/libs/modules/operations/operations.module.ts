import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { CalendarsModule } from './calendars/calendars.module';
import { OnlineBookingSettingsModule } from './online-booking-settings/online-booking-settings.module';
import { PublicBookingModule } from './public-booking/public-booking.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { ExpressBookingModule } from './express-booking/express-booking.module';
import { ResourcesModule } from './resources/resources.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeClockModule } from './time-clock/time-clock.module';
import { WorkItemsModule } from './work-items/work-items.module';
import { SchedulingSettingsModule } from './scheduling-settings/scheduling-settings.module';

@Module({
  imports: [
    TasksModule,
    AppointmentsModule,
    CalendarsModule,
    OnlineBookingSettingsModule,
    SchedulingSettingsModule,
    PublicBookingModule,
    WaitlistModule,
    ExpressBookingModule,
    WorkItemsModule,
    ResourcesModule,
    TimeClockModule,
  ],
})
export class OperationsModule {}
