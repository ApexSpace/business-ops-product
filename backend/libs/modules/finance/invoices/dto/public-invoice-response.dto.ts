import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoicePaymentStatus } from '@prisma/client';
import { InvoiceItemResponseDto } from './invoice-response.dto';

export class PublicInvoiceResponseDto {
  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  issueDate!: Date;

  @ApiPropertyOptional()
  dueDate?: Date | null;

  @ApiProperty()
  contactLabel!: string;

  @ApiProperty()
  subtotal!: string;

  @ApiProperty()
  taxAmount!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  paidAmount!: string;

  @ApiProperty()
  balanceDue!: string;

  @ApiProperty({ enum: InvoicePaymentStatus })
  paymentStatus!: InvoicePaymentStatus;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  currencySymbol!: string;

  @ApiProperty()
  isOverdue!: boolean;

  @ApiProperty()
  canPayOnline!: boolean;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items!: InvoiceItemResponseDto[];
}
