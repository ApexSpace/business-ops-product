import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateResourceGroupDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;
}

export class UpdateResourceGroupDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class ReorderResourceGroupsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

export class ResourceGroupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  resourceCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
