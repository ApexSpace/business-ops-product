import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactWalletTransactionType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const WALLET_ADJUST_TYPES = [
  ContactWalletTransactionType.MANUAL_CREDIT,
  ContactWalletTransactionType.MANUAL_DEBIT,
] as const;

export class AdjustContactWalletDto {
  @ApiProperty({ description: 'Positive amount to credit or debit' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: WALLET_ADJUST_TYPES })
  @IsEnum(WALLET_ADJUST_TYPES)
  type!: (typeof WALLET_ADJUST_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
