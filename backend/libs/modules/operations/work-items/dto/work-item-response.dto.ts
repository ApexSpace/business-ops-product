import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemStatus } from '@prisma/client';

class WorkItemContactSummaryDto {
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

  @ApiProperty()
  label!: string;
}

class WorkItemServiceSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiPropertyOptional()
  price?: string | null;
}

class WorkItemAssigneeSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;
}

export class WorkItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  contactId!: string;

  @ApiPropertyOptional()
  serviceId?: string | null;

  @ApiPropertyOptional()
  leadId?: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  type?: string | null;

  @ApiProperty({ enum: WorkItemStatus })
  status!: WorkItemStatus;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  scheduledAt?: Date | null;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  amount?: string | null;

  @ApiPropertyOptional()
  assignedToId?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: WorkItemContactSummaryDto })
  contact?: WorkItemContactSummaryDto;

  @ApiPropertyOptional({ type: WorkItemServiceSummaryDto })
  service?: WorkItemServiceSummaryDto | null;

  @ApiPropertyOptional({ type: WorkItemAssigneeSummaryDto })
  assignedTo?: WorkItemAssigneeSummaryDto | null;
}
