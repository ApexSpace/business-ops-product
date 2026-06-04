import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignLeadDto {
  @ApiProperty()
  @IsUUID('4')
  assignedToId!: string;
}
