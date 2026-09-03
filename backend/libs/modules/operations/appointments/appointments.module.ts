import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { CalendarsModule } from '@app/modules/operations/calendars/calendars.module';
import { ContactsModule } from '@app/modules/crm/contacts/contacts.module';
import { NotificationsModule } from '@app/modules/communications/notifications/notifications.module';
import { MembershipModule } from '@app/modules/platform/membership/membership.module';
import { ServicesModule } from '@app/modules/crm/services/services.module';
import { WorkItemsModule } from '@app/modules/operations/work-items/work-items.module';
import { PackagesModule } from '@app/modules/finance/packages/packages.module';
import { OnlineBookingSettingsModule } from '@app/modules/operations/online-booking-settings/online-booking-settings.module';
import { WaitlistModule } from '@app/modules/operations/waitlist/waitlist.module';
import { StorageModule } from '@app/modules/storage/storage.module';
import { AppointmentsController } from './controllers/appointments.controller';
import { WaitingRoomSettingsController } from './waiting-room-settings/controllers/waiting-room-settings.controller';
import { CancelRescheduleSettingsController } from './cancel-reschedule-settings/controllers/cancel-reschedule-settings.controller';
import { AppointmentAutomatedMessagesController } from './automated-messages/controllers/appointment-automated-messages.controller';
import { AppointmentRepository } from './repositories/appointment.repository';
import { WaitingRoomSettingsRepository } from './waiting-room-settings/repositories/waiting-room-settings.repository';
import { CancelRescheduleSettingsRepository } from './cancel-reschedule-settings/repositories/cancel-reschedule-settings.repository';
import { AppointmentAutomatedMessagesRepository } from './automated-messages/repositories/appointment-automated-messages.repository';
import { AppointmentNotificationService } from './services/appointment-notification.service';
import { AppointmentReminderService } from './services/appointment-reminder.service';
import { AppointmentsService } from './services/appointments.service';
import { WaitingRoomSettingsService } from './waiting-room-settings/services/waiting-room-settings.service';
import { CancelRescheduleSettingsService } from './cancel-reschedule-settings/services/cancel-reschedule-settings.service';
import { AppointmentAutomatedMessagesService } from './automated-messages/services/appointment-automated-messages.service';

@Module({
  imports: [
    AuditModule,
    BusinessModule,
    CalendarsModule,
    ContactsModule,
    ServicesModule,
    WorkItemsModule,
    MembershipModule,
    NotificationsModule,
    OnlineBookingSettingsModule,
    StorageModule,
    forwardRef(() => PackagesModule),
    forwardRef(() => WaitlistModule),
  ],
  controllers: [
    AppointmentsController,
    WaitingRoomSettingsController,
    CancelRescheduleSettingsController,
    AppointmentAutomatedMessagesController,
  ],
  providers: [
    AppointmentRepository,
    WaitingRoomSettingsRepository,
    CancelRescheduleSettingsRepository,
    AppointmentAutomatedMessagesRepository,
    AppointmentsService,
    AppointmentNotificationService,
    AppointmentReminderService,
    WaitingRoomSettingsService,
    CancelRescheduleSettingsService,
    AppointmentAutomatedMessagesService,
  ],
  exports: [
    AppointmentRepository,
    WaitingRoomSettingsRepository,
    CancelRescheduleSettingsRepository,
    AppointmentAutomatedMessagesRepository,
    AppointmentsService,
    AppointmentNotificationService,
    AppointmentReminderService,
    WaitingRoomSettingsService,
    CancelRescheduleSettingsService,
    AppointmentAutomatedMessagesService,
  ],
})
export class AppointmentsModule {}
