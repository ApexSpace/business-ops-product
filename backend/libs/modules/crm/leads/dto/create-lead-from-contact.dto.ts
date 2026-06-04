import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLeadFromContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  pipelineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  pipelineStageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  serviceId?: string;
}
