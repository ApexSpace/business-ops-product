import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CollectPaymentTenderDto } from '@app/modules/finance/payments/dto/collect-payment.dto';

export class ListCheckoutsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactId?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueTo?: string;
}

export class CloseCheckoutDto {
  @ApiProperty({ type: [CollectPaymentTenderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectPaymentTenderDto)
  tenders!: CollectPaymentTenderDto[];
}

export class CloseCheckoutResponseDto {
  @ApiProperty()
  completed!: boolean;

  @ApiProperty({ type: [String] })
  paymentIds!: string[];

  @ApiPropertyOptional()
  stripeTenders?: {
    paymentId: string;
    clientSecret: string;
    stripePaymentIntentId: string;
  }[];
}
