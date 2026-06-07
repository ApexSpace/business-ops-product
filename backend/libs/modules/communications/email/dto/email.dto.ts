import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EmailPreferenceItemDto {
  @IsString()
  emailType!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateEmailPreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmailPreferenceItemDto)
  preferences!: EmailPreferenceItemDto[];
}

export class UpdateEmailTemplateDto {
  @IsString()
  subject!: string;

  @IsString()
  htmlBody!: string;

  @IsOptional()
  @IsString()
  textBody?: string;
}

export class PreviewEmailTemplateDto {
  @IsString()
  subject!: string;

  @IsString()
  htmlBody!: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  variables?: Record<string, string>;
}

export class TestEmailTemplateDto extends PreviewEmailTemplateDto {
  @IsEmail()
  toEmail!: string;
}

export class ListEmailLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  emailType?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
