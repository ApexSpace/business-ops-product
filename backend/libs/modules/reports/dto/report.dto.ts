import { IsIn, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateReportDto {
  @ApiPropertyOptional({
    description: 'Report filter values keyed by filter field key',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

export class ExportReportDto {
  @ApiProperty({ enum: ['pdf', 'xlsx'] })
  @IsIn(['pdf', 'xlsx'])
  format!: 'pdf' | 'xlsx';

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
