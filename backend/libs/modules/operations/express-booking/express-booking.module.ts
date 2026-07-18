import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { NotificationsModule } from '@app/modules/communications/notifications/notifications.module';
import { SmsModule } from '@app/modules/communications/sms/sms.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { PaymentsModule } from '@app/modules/finance/payments/payments.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { OnlineBookingSettingsModule } from '@app/modules/operations/online-booking-settings/online-booking-settings.module';
import { PublicBookingModule } from '@app/modules/operations/public-booking/public-booking.module';
import { ExpressBookingController } from './controllers/express-booking.controller';
import { PublicExpressBookingController } from './controllers/public-express-booking.controller';
import { ExpressBookingService } from './services/express-booking.service';

@Module({
  imports: [
    AuditModule,
    BusinessModule,
    EmailModule,
    NotificationsModule,
    SmsModule,
    ServicesModule,
    ContactsModule,
    PaymentsModule,
    OnlineBookingSettingsModule,
    forwardRef(() => AppointmentsModule),
    forwardRef(() => PublicBookingModule),
  ],
  controllers: [ExpressBookingController, PublicExpressBookingController],
  providers: [ExpressBookingService],
  exports: [ExpressBookingService],
})
export class ExpressBookingModule {}
