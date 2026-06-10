import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  leadId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  description?: string;
}
