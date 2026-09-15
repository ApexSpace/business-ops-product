import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactPaymentMethodResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  brand?: string | null;

  @ApiPropertyOptional()
  last4?: string | null;

  @ApiPropertyOptional()
  expMonth?: number | null;

  @ApiPropertyOptional()
  expYear?: number | null;

  @ApiProperty()
  isDefault!: boolean;
}

export class ContactPaymentMethodListResponseDto {
  @ApiProperty({ type: [ContactPaymentMethodResponseDto] })
  items!: ContactPaymentMethodResponseDto[];
}

export class CreateSetupIntentResponseDto {
  @ApiProperty()
  clientSecret!: string;
}
