import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmUploadDto {
  @ApiPropertyOptional({ description: 'SHA-256 checksum after upload' })
  @IsOptional()
  @IsString()
  checksum?: string;
}
