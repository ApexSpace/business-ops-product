import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { CalendarsModule } from '@app/modules/operations/calendars/calendars.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { JobEnqueueModule } from '@app/core/jobs/job-enqueue.module';
import { PublicBookingController } from './controllers/public-booking.controller';
import { PublicBookingService } from './services/public-booking.service';
import { BookingAvailabilityService } from './services/booking-availability.service';
import { PublicBookingContactService } from './services/public-booking-contact.service';

@Module({
  imports: [
    AuditModule,
    CalendarsModule,
    AppointmentsModule,
    ContactsModule,
    ServicesModule,
    MembershipModule,
    EmailModule,
    JobEnqueueModule,
  ],
  controllers: [PublicBookingController],
  providers: [
    PublicBookingService,
    BookingAvailabilityService,
    PublicBookingContactService,
  ],
})
export class PublicBookingModule {}
