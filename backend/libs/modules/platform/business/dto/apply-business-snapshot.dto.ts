import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ApplyBusinessSnapshotDto {
  @ApiProperty()
  @IsUUID()
  snapshotId!: string;
}
