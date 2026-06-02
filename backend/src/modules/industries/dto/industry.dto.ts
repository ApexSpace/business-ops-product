import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IndustryStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  IndustryLabels,
  IndustryPipelineTemplate,
} from '../types/industry.types';

export class IndustryLabelsDto implements IndustryLabels {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  contacts!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  pipelines!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  leads!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  workItems!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  appointments!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  conversations!: string;
}

export class IndustryPipelineStageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ enum: ['OPEN', 'WON', 'LOST'] })
  @IsOptional()
  @IsEnum(['OPEN', 'WON', 'LOST'])
  type?: 'OPEN' | 'WON' | 'LOST';
}

export class IndustryPipelineTemplateDto implements IndustryPipelineTemplate {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  pipelineName!: string;

  @ApiProperty({ type: [IndustryPipelineStageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndustryPipelineStageDto)
  stages!: IndustryPipelineStageDto[];
}

export class IndustryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  labels!: IndustryLabels;

  @ApiProperty()
  pipelineTemplate!: IndustryPipelineTemplate;

  @ApiProperty({ enum: IndustryStatus })
  status!: IndustryStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CreateIndustryDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: IndustryLabelsDto })
  @ValidateNested()
  @Type(() => IndustryLabelsDto)
  labels!: IndustryLabelsDto;

  @ApiProperty({ type: IndustryPipelineTemplateDto })
  @ValidateNested()
  @Type(() => IndustryPipelineTemplateDto)
  pipelineTemplate!: IndustryPipelineTemplateDto;

  @ApiPropertyOptional({ enum: IndustryStatus })
  @IsOptional()
  @IsEnum(IndustryStatus)
  status?: IndustryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateIndustryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: IndustryLabelsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IndustryLabelsDto)
  labels?: IndustryLabelsDto;

  @ApiPropertyOptional({ type: IndustryPipelineTemplateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IndustryPipelineTemplateDto)
  pipelineTemplate?: IndustryPipelineTemplateDto;

  @ApiPropertyOptional({ enum: IndustryStatus })
  @IsOptional()
  @IsEnum(IndustryStatus)
  status?: IndustryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class IndustryOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  labels!: IndustryLabels;
}
