import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormPaymentRail } from '@prisma/client';

export class FormPaymentIntentResponseDto {
  @ApiProperty()
  attemptId!: string;

  @ApiProperty()
  paymentIntentId!: string;

  @ApiProperty()
  clientSecret!: string;

  @ApiProperty()
  publishableKey!: string;

  @ApiPropertyOptional({ nullable: true })
  stripeAccountId!: string | null;

  @ApiProperty()
  amountCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  livemode!: boolean;

  @ApiProperty({ enum: FormPaymentRail })
  rail!: FormPaymentRail;
}
