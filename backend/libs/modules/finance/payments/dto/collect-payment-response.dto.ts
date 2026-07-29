import { ApiProperty } from '@nestjs/swagger';
import { PayableType } from '@prisma/client';

export class StripeTenderResponseDto {
  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  clientSecret!: string;

  @ApiProperty()
  stripePaymentIntentId!: string;
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
}

export class StripeConnectContextResponseDto {
  @ApiProperty()
  ready!: boolean;

  @ApiProperty({ nullable: true })
  stripeAccountId!: string | null;

  @ApiProperty({ nullable: true })
  publishableKey!: string | null;

  @ApiProperty({ nullable: true })
  defaultCurrency!: string | null;

  @ApiProperty()
  livemode!: boolean;
}
