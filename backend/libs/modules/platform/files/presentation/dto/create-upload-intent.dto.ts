import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateUploadIntentDto {
  @ApiProperty()
  @IsString()
  originalName!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 102400 })
  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  sizeBytes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
