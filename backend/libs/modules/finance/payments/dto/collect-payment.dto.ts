import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PayableType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { PaymentChannel, StripeCollectionMode } from '../types/payable.types';

export class CollectPaymentTenderDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: 50.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactPaymentMethodId?: string;
}

export class CollectPaymentDto {
  @ApiProperty({ enum: PayableType })
  @IsEnum(PayableType)
  payableType!: PayableType;

  @ApiProperty()
  @IsUUID('4')
  payableId!: string;

  @ApiProperty({ type: [CollectPaymentTenderDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CollectPaymentTenderDto)
  tenders!: CollectPaymentTenderDto[];

  @ApiPropertyOptional({
    enum: ['STAFF_POS', 'CUSTOMER_REMOTE', 'CUSTOMER_SELF_CHECKOUT'],
    default: 'STAFF_POS',
  })
  @IsOptional()
  @IsString()
  channel?: PaymentChannel;

  @ApiPropertyOptional({
    enum: ['EMBEDDED', 'REDIRECT', 'NONE'],
    default: 'EMBEDDED',
  })
  @IsOptional()
  @IsString()
  stripeMode?: StripeCollectionMode;
}

export class StripeTenderResponseDto {
  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  clientSecret!: string;

  @ApiProperty()
  stripePaymentIntentId!: string;
}

export class RedirectTenderResponseDto {
  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  checkoutUrl!: string;

  @ApiProperty()
  sessionId!: string;
}

export class CollectPaymentResponseDto {
  @ApiProperty({ enum: PayableType })
  payableType!: PayableType;

  @ApiProperty()
  payableId!: string;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty({ type: [String] })
  paymentIds!: string[];

  @ApiProperty({ type: [StripeTenderResponseDto] })
  stripeTenders!: StripeTenderResponseDto[];

  @ApiProperty({ type: [RedirectTenderResponseDto] })
  redirectTenders!: RedirectTenderResponseDto[];
}
