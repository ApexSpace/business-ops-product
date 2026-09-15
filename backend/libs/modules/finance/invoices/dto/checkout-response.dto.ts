import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceLineType, InvoiceStatus } from '@prisma/client';
import { CheckoutAdvancedSettingsResponseDto } from '@app/modules/finance/checkout-advanced-settings/dto/checkout-advanced-settings.dto';

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

  @ApiPropertyOptional({
    description:
      'Line metadata (e.g. customFeeId for system-managed checkout fees)',
  })
  metadata?: Record<string, unknown> | null;
}

export class CheckoutContactSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;
}

export class AppliedCheckoutOfferDto {
  @ApiProperty()
  offerId!: string;

  @ApiProperty()
  offerName!: string;

  @ApiProperty()
  totalDiscount!: string;
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

  @ApiPropertyOptional({ type: [AppliedCheckoutOfferDto] })
  appliedOffers?: AppliedCheckoutOfferDto[];

  @ApiPropertyOptional()
  tipAmount?: string;

  @ApiPropertyOptional()
  advancedSettings?: CheckoutAdvancedSettingsResponseDto;
}
