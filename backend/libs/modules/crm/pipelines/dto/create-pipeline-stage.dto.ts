import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineStageType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePipelineStageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @ApiPropertyOptional({ enum: PipelineStageType })
  @IsOptional()
  @IsEnum(PipelineStageType)
  type?: PipelineStageType;
}
