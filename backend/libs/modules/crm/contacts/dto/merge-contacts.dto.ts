import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeContactsDto {
  @ApiProperty({
    description: 'Contact that will be soft-deleted and merged into the target',
  })
  @IsUUID()
  mergeContactId!: string;
}
