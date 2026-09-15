import { ApiProperty } from '@nestjs/swagger';
import {
  CustomFeeAmountType,
  CustomFeeApplicationScope,
  PaymentMethod,
} from '@prisma/client';

export class CustomFeeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: CustomFeeApplicationScope })
  applicationScope!: CustomFeeApplicationScope;

  @ApiProperty({ enum: PaymentMethod, isArray: true })
  paymentMethods!: PaymentMethod[];

  @ApiProperty({ enum: CustomFeeAmountType })
  amountType!: CustomFeeAmountType;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
