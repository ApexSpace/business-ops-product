import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { AppointmentsModule } from '@app/modules/operations/appointments/appointments.module';
import { PublicBookingModule } from '@app/modules/operations/public-booking/public-booking.module';
import { OnlineBookingSettingsModule } from '@app/modules/operations/online-booking-settings/online-booking-settings.module';
import { WaitlistController } from './controllers/waitlist.controller';
import { WaitlistRepository } from './repositories/waitlist.repository';
import { WaitlistService } from './services/waitlist.service';
import { WaitlistMatchingService } from './services/waitlist-matching.service';

@Module({
  imports: [
    AuditModule,
    ContactsModule,
    ServicesModule,
    MembershipModule,
    EmailModule,
    OnlineBookingSettingsModule,
    forwardRef(() => PublicBookingModule),
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [WaitlistController],
  providers: [
    WaitlistRepository,
    WaitlistService,
    WaitlistMatchingService,
  ],
  exports: [WaitlistService, WaitlistMatchingService],
})
export class WaitlistModule {}
