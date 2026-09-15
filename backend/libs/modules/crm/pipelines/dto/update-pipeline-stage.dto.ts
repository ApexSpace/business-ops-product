import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessLifecycleStage, PipelineStageType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePipelineStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: PipelineStageType })
  @IsOptional()
  @IsEnum(PipelineStageType)
  type?: PipelineStageType;

  @ApiPropertyOptional({ enum: BusinessLifecycleStage, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(BusinessLifecycleStage)
  mapsToLifecycleStage?: BusinessLifecycleStage | null;
}
