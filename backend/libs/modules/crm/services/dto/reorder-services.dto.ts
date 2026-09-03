import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsUUID,
} from 'class-validator';

export class ReorderServicesDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  categoryId!: string;

  @ApiProperty({ type: [String], description: 'Service IDs in the desired order within the category' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
