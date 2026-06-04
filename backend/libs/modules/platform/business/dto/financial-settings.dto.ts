import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class BusinessInformationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalBusinessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayBusinessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v != null)
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v != null)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v != null)
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class InvoiceSettingsDto {
  @ApiPropertyOptional({ example: 'INV', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  prefix?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nextNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultPaymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  defaultNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  defaultTermsAndConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showBusinessAddress?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPaymentInstructions?: boolean;
}

export class EstimateSettingsDto {
  @ApiPropertyOptional({ example: 'EST', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  prefix?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nextNumber?: number;

  @ApiPropertyOptional({ example: 30, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  defaultExpiryDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  defaultNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  defaultTermsAndConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showBusinessAddress?: boolean;
}

export class TaxesAndCurrencySettingsDto {
  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ example: 8, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pricesIncludeTax?: boolean;
}

export class UpdateFinancialSettingsDto {
  @ApiPropertyOptional({ type: InvoiceSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceSettingsDto)
  invoice?: InvoiceSettingsDto;

  @ApiPropertyOptional({ type: EstimateSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EstimateSettingsDto)
  estimate?: EstimateSettingsDto;
}

export class FinancialSettingsResponseDto {
  @ApiProperty({ type: InvoiceSettingsDto })
  invoice!: InvoiceSettingsDto & {
    nextInvoiceNumberPreview: string;
  };

  @ApiProperty({ type: EstimateSettingsDto })
  estimate!: EstimateSettingsDto & {
    nextEstimateNumberPreview: string;
  };

  @ApiProperty({ type: TaxesAndCurrencySettingsDto })
  taxesAndCurrency!: TaxesAndCurrencySettingsDto;
}
