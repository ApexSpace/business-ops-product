import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomFeeAmountType,
  CustomFeeApplicationScope,
  PaymentMethod,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListCustomFeesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class CreateCustomFeeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: CustomFeeApplicationScope })
  @IsEnum(CustomFeeApplicationScope)
  applicationScope!: CustomFeeApplicationScope;

  @ApiPropertyOptional({ enum: PaymentMethod, isArray: true })
  @ValidateIf(
    (dto: CreateCustomFeeDto) =>
      dto.applicationScope === CustomFeeApplicationScope.PAYMENT_METHOD,
  )
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  paymentMethods?: PaymentMethod[];

  @ApiProperty({ enum: CustomFeeAmountType })
  @IsEnum(CustomFeeAmountType)
  amountType!: CustomFeeAmountType;

  @ApiProperty({ example: '5.00' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateCustomFeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: CustomFeeApplicationScope })
  @IsOptional()
  @IsEnum(CustomFeeApplicationScope)
  applicationScope?: CustomFeeApplicationScope;

  @ApiPropertyOptional({ enum: PaymentMethod, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  paymentMethods?: PaymentMethod[];

  @ApiPropertyOptional({ enum: CustomFeeAmountType })
  @IsOptional()
  @IsEnum(CustomFeeAmountType)
  amountType?: CustomFeeAmountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
