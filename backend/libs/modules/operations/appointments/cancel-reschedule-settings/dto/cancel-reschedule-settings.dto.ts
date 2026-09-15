import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SelfCancellationMode,
  SelfRescheduleMode,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CancelRescheduleSettingsResponseDto {
  @ApiProperty()
  cancellationPolicyHtml!: string | null;

  @ApiProperty()
  cancellationPolicySms!: string | null;

  @ApiProperty()
  requirePolicyAgreement!: boolean;

  @ApiProperty({ enum: SelfCancellationMode })
  selfCancellationMode!: SelfCancellationMode;

  @ApiProperty()
  selfCancellationMinutes!: number;

  @ApiProperty()
  selfCancellationHoursBefore!: number;

  @ApiProperty({ enum: SelfRescheduleMode })
  selfRescheduleMode!: SelfRescheduleMode;

  @ApiProperty()
  selfRescheduleHoursBefore!: number;

  @ApiProperty()
  lateCancellationHoursBefore!: number;
}

export class UpdateCancellationPolicyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationPolicyHtml?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(215)
  cancellationPolicySms?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requirePolicyAgreement?: boolean;
}

export class UpdateSelfServiceSettingsDto {
  @ApiProperty({ enum: SelfCancellationMode })
  @IsEnum(SelfCancellationMode)
  selfCancellationMode!: SelfCancellationMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  selfCancellationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  selfCancellationHoursBefore?: number;

  @ApiProperty({ enum: SelfRescheduleMode })
  @IsEnum(SelfRescheduleMode)
  selfRescheduleMode!: SelfRescheduleMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  selfRescheduleHoursBefore?: number;
}

export class UpdateLateCancellationDto {
  @ApiProperty()
  @IsInt()
  lateCancellationHoursBefore!: number;
}
