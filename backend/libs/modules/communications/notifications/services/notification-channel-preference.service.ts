import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  CHANNEL_OVERRIDE_NOTIFICATION_KEYS,
  DEFAULT_NOTIFICATION_CHANNEL,
  isChannelOverrideNotificationKey,
} from '../constants/notification-channel.constants';
import { NotificationChannelPreferenceRepository } from '../repositories/notification-channel-preference.repository';

export interface NotificationChannelPreferenceItem {
  notificationKey: string;
  channel: NotificationChannel;
  isDefault: boolean;
}

@Injectable()
export class NotificationChannelPreferenceService {
  constructor(
    private readonly preferenceRepository: NotificationChannelPreferenceRepository,
  ) {}

  async getChannel(
    businessId: string,
    notificationKey: string,
  ): Promise<NotificationChannel> {
    const item = await this.getPreference(businessId, notificationKey);
    return item.channel;
  }

  async getPreference(
    businessId: string,
    notificationKey: string,
  ): Promise<NotificationChannelPreferenceItem> {
    const row = await this.preferenceRepository.findByBusinessAndKey(
      businessId,
      notificationKey,
    );
    return {
      notificationKey,
      channel: row?.channel ?? DEFAULT_NOTIFICATION_CHANNEL,
      isDefault: row == null,
    };
  }

  async setChannel(
    businessId: string,
    notificationKey: string,
    channel: NotificationChannel,
  ): Promise<NotificationChannelPreferenceItem> {
    if (!isChannelOverrideNotificationKey(notificationKey)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Channel preference is not supported for notification key: ${notificationKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const row = await this.preferenceRepository.upsert(
      businessId,
      notificationKey,
      channel,
    );

    return {
      notificationKey: row.notificationKey,
      channel: row.channel,
      isDefault: false,
    };
  }

  async listForBusiness(
    businessId: string,
  ): Promise<NotificationChannelPreferenceItem[]> {
    const stored = await this.preferenceRepository.findByBusiness(businessId);
    const byKey = new Map(
      stored.map((row) => [row.notificationKey, row.channel] as const),
    );

    return CHANNEL_OVERRIDE_NOTIFICATION_KEYS.map((notificationKey) => {
      const channel = byKey.get(notificationKey);
      return {
        notificationKey,
        channel: channel ?? DEFAULT_NOTIFICATION_CHANNEL,
        isDefault: channel == null,
      };
    });
  }
}
