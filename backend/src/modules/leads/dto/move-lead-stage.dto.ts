import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MoveLeadStageDto {
  @ApiProperty()
  @IsUUID('4')
  pipelineStageId!: string;
}
