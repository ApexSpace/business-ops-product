import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCommissionType, ServiceStatus } from '@prisma/client';
import type { ServiceStaffingMode } from '../utils/service-staffing.util';

export class ServiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  price?: string | null;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isDemo!: boolean;

  @ApiProperty()
  hasProcessingTime!: boolean;

  @ApiProperty()
  processingDurationMinutes!: number;

  @ApiPropertyOptional()
  finishDurationMinutes?: number | null;

  @ApiProperty()
  hasBufferTime!: boolean;

  @ApiProperty()
  bufferBeforeMinutes!: number;

  @ApiProperty()
  bufferAfterMinutes!: number;

  @ApiProperty()
  usesProducts!: boolean;

  @ApiProperty()
  requiresNoStaff!: boolean;

  @ApiProperty()
  requiresTwoStaff!: boolean;

  @ApiProperty()
  hasCommissionDeduction!: boolean;

  @ApiPropertyOptional({ enum: ServiceCommissionType })
  commissionDeductionType?: ServiceCommissionType | null;

  @ApiPropertyOptional()
  commissionDeductionValue?: string | null;

  @ApiProperty()
  staffingMode!: ServiceStaffingMode;

  @ApiProperty()
  clientOccupancyMinutes!: number;

  @ApiProperty()
  staffBlockedMinutes!: number;

  @ApiProperty({ enum: ServiceStatus })
  status!: ServiceStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
