import { Module } from '@nestjs/common';
import { NotificationChannelPreferencesController } from './controllers/notification-channel-preferences.controller';
import { NotificationChannelPreferenceRepository } from './repositories/notification-channel-preference.repository';
import { NotificationChannelPreferenceService } from './services/notification-channel-preference.service';

@Module({
  controllers: [NotificationChannelPreferencesController],
  providers: [
    NotificationChannelPreferenceRepository,
    NotificationChannelPreferenceService,
  ],
  exports: [NotificationChannelPreferenceService],
})
export class NotificationsModule {}
