import { ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineStageType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
