import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstimateStatus } from '@prisma/client';

export class EstimateItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  serviceId?: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  quantity!: string;

  @ApiProperty()
  unitPrice!: string;

  @ApiProperty()
  totalPrice!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class EstimateContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class EstimateWorkItemSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;
}

export class EstimateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  contactId!: string;

  @ApiPropertyOptional()
  workItemId?: string | null;

  @ApiProperty()
  estimateNumber!: string;

  @ApiProperty({ enum: EstimateStatus })
  status!: EstimateStatus;

  @ApiProperty()
  issueDate!: Date;

  @ApiPropertyOptional()
  expiryDate?: Date | null;

  @ApiProperty()
  subtotal!: string;

  @ApiProperty()
  taxAmount!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  termsAndConditions?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  contact?: EstimateContactSummaryDto;

  @ApiPropertyOptional()
  workItem?: EstimateWorkItemSummaryDto | null;

  @ApiProperty({ type: [EstimateItemResponseDto] })
  items!: EstimateItemResponseDto[];
}
