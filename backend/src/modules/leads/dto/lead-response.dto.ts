import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '@prisma/client';

class LeadContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;
}

class LeadPipelineSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

class LeadStageSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  position!: number;

  @ApiPropertyOptional()
  type?: string | null;
}

class LeadServiceSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiPropertyOptional()
  price?: string | null;
}

class LeadAssigneeSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;
}

export class LeadResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiPropertyOptional()
  contactId?: string | null;

  @ApiPropertyOptional()
  serviceId?: string | null;

  @ApiProperty()
  pipelineId!: string;

  @ApiProperty()
  pipelineStageId!: string;

  @ApiPropertyOptional()
  assignedToId?: string | null;

  @ApiPropertyOptional()
  title?: string | null;

  @ApiPropertyOptional()
  value?: string | null;

  @ApiProperty({ enum: LeadStatus })
  status!: LeadStatus;

  @ApiPropertyOptional()
  source?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: LeadContactSummaryDto })
  contact?: LeadContactSummaryDto | null;

  @ApiPropertyOptional({ type: LeadServiceSummaryDto })
  service?: LeadServiceSummaryDto | null;

  @ApiProperty({ type: LeadPipelineSummaryDto })
  pipeline!: LeadPipelineSummaryDto;

  @ApiProperty({ type: LeadStageSummaryDto })
  pipelineStage!: LeadStageSummaryDto;

  @ApiPropertyOptional({ type: LeadAssigneeSummaryDto })
  assignedTo?: LeadAssigneeSummaryDto | null;
}
