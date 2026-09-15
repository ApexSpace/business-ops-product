import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdatePaymentsModeDto {
  @ApiProperty({ enum: ['live', 'test'] })
  @IsIn(['live', 'test'])
  mode!: 'live' | 'test';
}
