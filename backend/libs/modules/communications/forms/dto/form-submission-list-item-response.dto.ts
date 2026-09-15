import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FormSubmissionListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  formId!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data!: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}
