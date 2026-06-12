import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ChangeBusinessPlanTierDto {
  @ApiProperty()
  @IsUUID()
  planTierId!: string;
}
