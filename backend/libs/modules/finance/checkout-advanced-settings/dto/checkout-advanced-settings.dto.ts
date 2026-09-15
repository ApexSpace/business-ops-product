import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CheckoutAdvancedSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty({ type: [String] })
  customPaymentMethodNames!: string[];

  @ApiProperty({ type: [Number], example: [18, 20, 22] })
  tipButtonPercents!: number[];

  @ApiProperty()
  hideTipButtons!: boolean;

  @ApiProperty()
  askClientsForTip!: boolean;

  @ApiProperty()
  askForTipProductsOnly!: boolean;

  @ApiProperty()
  askClientsForSignature!: boolean;

  @ApiProperty()
  enableCheckPayments!: boolean;

  @ApiProperty()
  showChangeCalculator!: boolean;

  @ApiProperty()
  showReceiptPreview!: boolean;

  @ApiProperty()
  requireStaffForServices!: boolean;

  @ApiProperty()
  requireStaffForProducts!: boolean;

  @ApiProperty()
  requireStaffForGiftCards!: boolean;

  @ApiProperty()
  requireStaffForPackages!: boolean;

  @ApiProperty()
  showServiceProviderOnReceipt!: boolean;

  @ApiPropertyOptional()
  receiptCustomFooterText?: string | null;
}

export class UpdateCheckoutAdvancedSettingsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  customPaymentMethodNames?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(100, { each: true })
  tipButtonPercents?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideTipButtons?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  askClientsForTip?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  askForTipProductsOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  askClientsForSignature?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableCheckPayments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showChangeCalculator?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showReceiptPreview?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireStaffForServices?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireStaffForProducts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireStaffForGiftCards?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireStaffForPackages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showServiceProviderOnReceipt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptCustomFooterText?: string | null;
}
