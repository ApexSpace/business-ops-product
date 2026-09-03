import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StripeAccountLinkResponseDto {
  @ApiProperty()
  url!: string;
}

export type StripeConnectionStatus =
  | 'NOT_CONNECTED'
  | 'CONNECTED_INCOMPLETE'
  | 'READY';

export class PrimaryPaymentAccountResponseDto {
  @ApiProperty({ enum: ['NOT_CONNECTED', 'CONNECTED_INCOMPLETE', 'READY'] })
  connectionStatus!: StripeConnectionStatus;

  @ApiProperty()
  ready!: boolean;

  @ApiPropertyOptional()
  stripeAccountId?: string | null;

  @ApiPropertyOptional()
  accountName?: string | null;

  @ApiPropertyOptional()
  readinessLabel?: string | null;

  @ApiPropertyOptional()
  modeLabel?: string | null;

  @ApiPropertyOptional()
  defaultCurrency?: string | null;

  @ApiPropertyOptional()
  country?: string | null;

  @ApiProperty()
  livemode!: boolean;

  @ApiPropertyOptional()
  publishableKey?: string | null;
}
