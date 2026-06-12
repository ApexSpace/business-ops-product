import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormDefinitionDto } from './form-definition.dto';

export class FormListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  slug!: string | null;

  @ApiProperty()
  publicKey!: string;

  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  status!: 'draft' | 'published' | 'archived';

  @ApiProperty()
  fieldCount!: number;

  @ApiPropertyOptional({ description: 'Included on list responses' })
  submissionCount?: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  publishedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  archivedAt?: string | null;
}

export class FormResponseDto extends FormListItemResponseDto {
  @ApiProperty({ type: FormDefinitionDto })
  definition!: FormDefinitionDto;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  metadata?: Record<string, unknown> | null;
}
