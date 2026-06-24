import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactWalletTransactionType } from '@prisma/client';

export class ContactWalletBalanceDto {
  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;
}

export class ContactWalletTransactionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: ContactWalletTransactionType })
  type!: ContactWalletTransactionType;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ContactWalletCapabilitiesDto {
  @ApiProperty()
  paymentMethods!: boolean;

  @ApiProperty()
  giftCards!: boolean;
}

export class ContactWalletResponseDto {
  @ApiProperty({ type: ContactWalletBalanceDto })
  balance!: ContactWalletBalanceDto;

  @ApiProperty({ type: [ContactWalletTransactionDto] })
  transactions!: ContactWalletTransactionDto[];

  @ApiProperty({ type: [Object] })
  paymentMethods!: unknown[];

  @ApiProperty({ type: [Object] })
  giftCards!: unknown[];

  @ApiProperty({ type: ContactWalletCapabilitiesDto })
  capabilities!: ContactWalletCapabilitiesDto;
}
