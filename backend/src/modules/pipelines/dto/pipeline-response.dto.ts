import { ApiProperty } from '@nestjs/swagger';
import { PipelineStageResponseDto } from './pipeline-stage-response.dto';

export class PipelineResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ type: [PipelineStageResponseDto] })
  stages!: PipelineStageResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
