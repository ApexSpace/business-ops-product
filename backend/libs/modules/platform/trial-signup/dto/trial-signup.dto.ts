import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  TRIAL_PROVIDER_COUNT_BANDS,
  TRIAL_SERVICE_OPTIONS,
} from '../constants/trial-signup.constants';

export class UpdateTrialSessionDto {
  @ApiPropertyOptional({ type: [String], enum: TRIAL_SERVICE_OPTIONS })
  @IsOptional()
  @IsArray()
  @IsIn([...TRIAL_SERVICE_OPTIONS], { each: true })
  servicesOffered?: string[];

  @ApiPropertyOptional({ enum: TRIAL_PROVIDER_COUNT_BANDS })
  @IsOptional()
  @IsIn([...TRIAL_PROVIDER_COUNT_BANDS])
  providerCountBand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;
}

export class CreateOrUpdateTrialSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTrialSessionDto)
  payload?: UpdateTrialSessionDto;
}

export class TrialSendOtpDto {
  @ApiProperty({ example: '+15551234567' })
  @IsString()
  phoneE164!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class TrialVerifyOtpDto {
  @ApiProperty({ example: '+15551234567' })
  @IsString()
  phoneE164!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  code!: string;
}

export class TrialCompleteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn([...TRIAL_SERVICE_OPTIONS], { each: true })
  servicesOffered!: string[];

  @ApiProperty({ enum: TRIAL_PROVIDER_COUNT_BANDS })
  @IsIn([...TRIAL_PROVIDER_COUNT_BANDS])
  providerCountBand!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  businessName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty()
  @IsString()
  phoneVerificationToken!: string;
}

export class TrialHandoffExchangeDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  code!: string;
}
