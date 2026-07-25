import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessLifecycleStage, PipelineStageType } from '@prisma/client';

export class PipelineStageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  pipelineId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  position!: number;

  @ApiPropertyOptional({ enum: PipelineStageType })
  type?: PipelineStageType | null;

  @ApiPropertyOptional({ enum: BusinessLifecycleStage, nullable: true })
  mapsToLifecycleStage?: BusinessLifecycleStage | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
