import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class SendWhatsAppTemplateHeaderMediaDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  type!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  url!: string;
}

export class SendWhatsAppTemplateDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  language!: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  components?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SendWhatsAppTemplateHeaderMediaDto)
  headerMedia?: SendWhatsAppTemplateHeaderMediaDto;
}

export class SendMessageDto {
  @ApiPropertyOptional()
  @ValidateIf(
    (dto: SendMessageDto) =>
      !dto.attachments?.length && !dto.template,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  attachments?: unknown[];

  @ApiPropertyOptional({ description: 'Email subject (EMAIL channel only)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({ description: 'WhatsApp template (required outside 24h window)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SendWhatsAppTemplateDto)
  template?: SendWhatsAppTemplateDto;
}
