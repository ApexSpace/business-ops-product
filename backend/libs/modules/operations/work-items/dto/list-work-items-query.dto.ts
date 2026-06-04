import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListWorkItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: WorkItemStatus })
  @IsOptional()
  @IsEnum(WorkItemStatus)
  status?: WorkItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Filter scheduledAt >= this ISO date' })
  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @ApiPropertyOptional({ description: 'Filter scheduledAt <= this ISO date' })
  @IsOptional()
  @IsDateString()
  scheduledTo?: string;
}
