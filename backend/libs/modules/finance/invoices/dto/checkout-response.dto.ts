import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceLineType, InvoiceStatus } from '@prisma/client';

export class CheckoutStaffSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class CheckoutItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: InvoiceLineType })
  lineType!: InvoiceLineType;

  @ApiPropertyOptional()
  serviceId?: string | null;

  @ApiPropertyOptional()
  productId?: string | null;

  @ApiPropertyOptional()
  variantId?: string | null;

  @ApiPropertyOptional()
  staffUserId?: string | null;

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
  sortOrder!: number;

  @ApiPropertyOptional()
  staff?: CheckoutStaffSummaryDto | null;
}

export class CheckoutContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class CheckoutResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contactId!: string;

  @ApiProperty()
  saleNumber!: string;

  @ApiProperty()
  displaySequence!: number;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty()
  isOpen!: boolean;

  @ApiProperty()
  issueDate!: Date;

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

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  closedAt?: Date | null;

  @ApiPropertyOptional()
  closedById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  contact?: CheckoutContactSummaryDto;

  @ApiProperty({ type: [CheckoutItemResponseDto] })
  items!: CheckoutItemResponseDto[];
}
