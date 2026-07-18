import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import { IsEnum, IsIn, IsString } from 'class-validator';
import { CHANNEL_OVERRIDE_NOTIFICATION_KEYS } from '../constants/notification-channel.constants';

export class UpdateNotificationChannelPreferenceDto {
  @ApiProperty({
    example: 'appointment.express_complete',
    enum: CHANNEL_OVERRIDE_NOTIFICATION_KEYS,
  })
  @IsString()
  @IsIn([...CHANNEL_OVERRIDE_NOTIFICATION_KEYS])
  notificationKey!: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;
}

export class NotificationChannelPreferenceResponseDto {
  @ApiProperty()
  notificationKey!: string;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty({
    description: 'True when no stored preference exists (defaults to EMAIL)',
  })
  isDefault!: boolean;
}
