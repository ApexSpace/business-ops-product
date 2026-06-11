import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional()
  @ValidateIf((dto: SendMessageDto) => !dto.attachments?.length)
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
}
