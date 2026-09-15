import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AppointmentAutomatedMessageEventType,
  AppointmentAutomatedMessageOffsetUnit,
  AppointmentAutomatedMessageSourceScope,
  AppointmentAutomatedMessageTriggerKind,
  AppointmentStatus,
  NotificationChannel,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class AppointmentAutomatedMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AppointmentAutomatedMessageSourceScope })
  sourceScope!: AppointmentAutomatedMessageSourceScope;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty()
  notificationKey!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  enabled!: boolean;
}

export class AppointmentAutomatedMessageTriggerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AppointmentAutomatedMessageTriggerKind })
  kind!: AppointmentAutomatedMessageTriggerKind;

  @ApiPropertyOptional({ nullable: true })
  offsetValue!: number | null;

  @ApiPropertyOptional({
    enum: AppointmentAutomatedMessageOffsetUnit,
    nullable: true,
  })
  offsetUnit!: AppointmentAutomatedMessageOffsetUnit | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [AppointmentAutomatedMessageDto] })
  messages!: AppointmentAutomatedMessageDto[];
}

export class AppointmentAutomatedMessageSettingsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty({ enum: AppointmentAutomatedMessageEventType })
  eventType!: AppointmentAutomatedMessageEventType;

  @ApiPropertyOptional({ enum: AppointmentStatus, nullable: true })
  defaultStatus!: AppointmentStatus | null;

  @ApiProperty({ type: [AppointmentAutomatedMessageTriggerDto] })
  triggers!: AppointmentAutomatedMessageTriggerDto[];
}

export class UpdateAppointmentAutomatedMessageSettingsDto {
  @ApiPropertyOptional({
    enum: [AppointmentStatus.UNCONFIRMED, AppointmentStatus.CONFIRMED],
  })
  @IsOptional()
  @IsEnum([AppointmentStatus.UNCONFIRMED, AppointmentStatus.CONFIRMED])
  defaultStatus?: AppointmentStatus;
}

export class CreateAppointmentAutomatedMessageTriggerDto {
  @ApiProperty({ enum: AppointmentAutomatedMessageTriggerKind })
  @IsEnum(AppointmentAutomatedMessageTriggerKind)
  kind!: AppointmentAutomatedMessageTriggerKind;

  @ApiPropertyOptional()
  @ValidateIf(
    (o: CreateAppointmentAutomatedMessageTriggerDto) =>
      o.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  offsetValue?: number;

  @ApiPropertyOptional({ enum: AppointmentAutomatedMessageOffsetUnit })
  @ValidateIf(
    (o: CreateAppointmentAutomatedMessageTriggerDto) =>
      o.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START,
  )
  @IsEnum(AppointmentAutomatedMessageOffsetUnit)
  offsetUnit?: AppointmentAutomatedMessageOffsetUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateAppointmentAutomatedMessageTriggerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  offsetValue?: number;

  @ApiPropertyOptional({ enum: AppointmentAutomatedMessageOffsetUnit })
  @IsOptional()
  @IsEnum(AppointmentAutomatedMessageOffsetUnit)
  offsetUnit?: AppointmentAutomatedMessageOffsetUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateAppointmentAutomatedMessageDto {
  @ApiProperty({ enum: AppointmentAutomatedMessageSourceScope })
  @IsEnum(AppointmentAutomatedMessageSourceScope)
  sourceScope!: AppointmentAutomatedMessageSourceScope;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  notificationKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAppointmentAutomatedMessageDto {
  @ApiPropertyOptional({ enum: AppointmentAutomatedMessageSourceScope })
  @IsOptional()
  @IsEnum(AppointmentAutomatedMessageSourceScope)
  sourceScope?: AppointmentAutomatedMessageSourceScope;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  notificationKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class AppointmentAutomatedMessageCatalogItemDto {
  @ApiProperty()
  notificationKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: NotificationChannel, isArray: true })
  channels!: NotificationChannel[];
}
