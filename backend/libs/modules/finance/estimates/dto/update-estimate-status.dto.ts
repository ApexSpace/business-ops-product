import { ApiProperty } from '@nestjs/swagger';
import { EstimateStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEstimateStatusDto {
  @ApiProperty({ enum: EstimateStatus })
  @IsEnum(EstimateStatus)
  status!: EstimateStatus;
}
