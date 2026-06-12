import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional } from 'class-validator';

export class FormDefinitionDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  /** Keep field rows as plain objects (implicit conversion otherwise coerces them to []). */
  @Type(() => Object)
  @IsArray()
  fields!: unknown[];

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  settings!: Record<string, unknown>;
}

export class FormMetadataDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
