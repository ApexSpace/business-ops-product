import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NoteUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;
}

export class NoteContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class NoteLeadSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  title?: string | null;
}

export class NoteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiPropertyOptional()
  contactId?: string | null;

  @ApiPropertyOptional()
  leadId?: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  descriptionText?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  contact?: NoteContactSummaryDto | null;

  @ApiPropertyOptional()
  lead?: NoteLeadSummaryDto | null;

  @ApiPropertyOptional()
  createdBy?: NoteUserSummaryDto | null;
}
