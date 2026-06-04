import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class PaymentUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;
}

export class PaymentContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class PaymentInvoiceSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  balanceDue!: string;

  @ApiProperty()
  status!: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  invoiceId!: string;

  @ApiProperty()
  contactId!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiPropertyOptional()
  reference?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  paidAt!: Date;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  contact?: PaymentContactSummaryDto | null;

  @ApiPropertyOptional()
  invoice?: PaymentInvoiceSummaryDto | null;

  @ApiPropertyOptional()
  createdBy?: PaymentUserSummaryDto | null;
}
