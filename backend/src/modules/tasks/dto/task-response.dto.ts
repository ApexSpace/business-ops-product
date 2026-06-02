import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class TaskUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;
}

export class TaskContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class TaskLeadSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  title?: string | null;
}

export class TaskResponseDto {
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

  @ApiProperty()
  dueAt!: Date;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  priority?: TaskPriority | null;

  @ApiPropertyOptional()
  assignedToId?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  contact?: TaskContactSummaryDto | null;

  @ApiPropertyOptional()
  lead?: TaskLeadSummaryDto | null;

  @ApiPropertyOptional()
  assignedTo?: TaskUserSummaryDto | null;

  @ApiPropertyOptional()
  createdBy?: TaskUserSummaryDto | null;
}
