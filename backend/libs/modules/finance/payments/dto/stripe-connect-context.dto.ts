import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StripeConnectContextResponseDto {
  @ApiProperty()
  ready!: boolean;

  @ApiPropertyOptional()
  stripeAccountId?: string | null;

  @ApiPropertyOptional()
  publishableKey?: string | null;

  @ApiPropertyOptional()
  defaultCurrency?: string | null;

  @ApiProperty()
  livemode!: boolean;
}
