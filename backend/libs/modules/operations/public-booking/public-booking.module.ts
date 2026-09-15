import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { CalendarsModule } from '@app/modules/operations/calendars/calendars.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { NotificationsModule } from '@app/modules/communications/notifications/notifications.module';
import { JobEnqueueModule } from '@app/core/jobs/job-enqueue.module';
import { OnlineBookingSettingsModule } from '@app/modules/operations/online-booking-settings/online-booking-settings.module';
import { SchedulingSettingsModule } from '@app/modules/operations/scheduling-settings/scheduling-settings.module';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { PaymentsModule } from '@app/modules/finance/payments/payments.module';
import { RedisModule } from '@app/core/redis/redis.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { PublicBookingController } from './controllers/public-booking.controller';
import { PublicAppointmentManageController } from './controllers/public-appointment-manage.controller';
import { PublicBookingService } from './services/public-booking.service';
import { PublicAppointmentManageService } from './services/public-appointment-manage.service';
import { BookingAvailabilityService } from './services/booking-availability.service';
import { BusinessAvailabilityService } from './services/business-availability.service';
import { PublicBookingContactService } from './services/public-booking-contact.service';
import { PublicBookingCheckoutService } from './services/public-booking-checkout.service';
import { WaitlistModule } from '@app/modules/operations/waitlist/waitlist.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';

@Module({
  imports: [
    AuditModule,
    BusinessModule,
    CalendarsModule,
    forwardRef(() => AppointmentsModule),
    ContactsModule,
    ServicesModule,
    MembershipModule,
    NotificationsModule,
    JobEnqueueModule,
    OnlineBookingSettingsModule,
    SchedulingSettingsModule,
    IntegrationsModule,
    PaymentsModule,
    RedisModule,
    StorageModule,
    forwardRef(() => WaitlistModule),
  ],
  controllers: [PublicBookingController, PublicAppointmentManageController],
  providers: [
    PublicBookingService,
    PublicAppointmentManageService,
    BookingAvailabilityService,
    BusinessAvailabilityService,
    PublicBookingContactService,
    PublicBookingCheckoutService,
  ],
  exports: [
    PublicBookingService,
    PublicBookingContactService,
    BusinessAvailabilityService,
    OnlineBookingSettingsModule,
  ],
})
export class PublicBookingModule {}
