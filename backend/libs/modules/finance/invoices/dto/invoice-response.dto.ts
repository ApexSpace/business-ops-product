import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoicePaymentStatus, InvoiceStatus } from '@prisma/client';

export class InvoiceItemResponseDto {
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

export class InvoiceContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class InvoiceEstimateSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  estimateNumber!: string;
}

export class InvoiceWorkItemSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;
}

export class InvoiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  contactId!: string;

  @ApiPropertyOptional()
  estimateId?: string | null;

  @ApiPropertyOptional()
  workItemId?: string | null;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty()
  issueDate!: Date;

  @ApiPropertyOptional()
  dueDate?: Date | null;

  @ApiProperty()
  subtotal!: string;

  @ApiProperty()
  taxAmount!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  balanceDue!: string;

  @ApiProperty()
  publicToken!: string;

  @ApiPropertyOptional()
  publicUrl?: string | null;

  @ApiProperty({ enum: InvoicePaymentStatus })
  paymentStatus!: InvoicePaymentStatus;

  @ApiProperty()
  paidAmount!: string;

  @ApiProperty()
  remainingAmount!: string;

  @ApiPropertyOptional()
  lastPaymentAt?: Date | null;

  @ApiPropertyOptional()
  stripeCheckoutUrl?: string | null;

  @ApiPropertyOptional()
  stripePaymentLinkId?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  paymentTerms?: string | null;

  @ApiPropertyOptional()
  termsAndConditions?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  contact?: InvoiceContactSummaryDto;

  @ApiPropertyOptional()
  estimate?: InvoiceEstimateSummaryDto | null;

  @ApiPropertyOptional()
  workItem?: InvoiceWorkItemSummaryDto | null;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items!: InvoiceItemResponseDto[];
}
