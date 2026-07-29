import { Module, forwardRef } from '@nestjs/common';
import { EmailModule } from '@app/modules/communications/email/email.module';
import { SmsModule } from '@app/modules/communications/sms/sms.module';
import { BusinessModule } from '@app/modules/platform/business/business.module';
import { NotificationChannelPreferencesController } from './controllers/notification-channel-preferences.controller';
import { NotificationChannelPreferenceRepository } from './repositories/notification-channel-preference.repository';
import { NotificationChannelPreferenceService } from './services/notification-channel-preference.service';
import { NotificationDispatchService } from './services/notification-dispatch.service';

@Module({
  imports: [
    forwardRef(() => EmailModule),
    forwardRef(() => SmsModule),
    forwardRef(() => BusinessModule),
  ],
  controllers: [NotificationChannelPreferencesController],
  providers: [
    NotificationChannelPreferenceRepository,
    NotificationChannelPreferenceService,
    NotificationDispatchService,
  ],
  exports: [
    NotificationChannelPreferenceService,
    NotificationDispatchService,
  ],
})
export class NotificationsModule {}
