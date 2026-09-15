import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmUploadDto {
  @ApiPropertyOptional({
    description: 'Optional client-side note; reserved for future use',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
