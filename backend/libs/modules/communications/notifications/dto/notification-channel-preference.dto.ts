import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import {
  IsEnum,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isChannelOverrideNotificationKey } from '../constants/notification-channel.constants';

@ValidatorConstraint({ name: 'isChannelOverrideKey', async: false })
class IsChannelOverrideKeyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isChannelOverrideNotificationKey(value);
  }

  defaultMessage() {
    return 'Channel preference is not supported for this notification key';
  }
}

export class UpdateNotificationChannelPreferenceDto {
  @ApiProperty({
    example: 'appointment.express_complete',
    description: 'Business-configurable notification key',
  })
  @IsString()
  @Validate(IsChannelOverrideKeyConstraint)
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
