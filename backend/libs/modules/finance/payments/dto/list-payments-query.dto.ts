import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Filter paidAt >= this ISO date' })
  @IsOptional()
  @IsDateString()
  paidFrom?: string;

  @ApiPropertyOptional({ description: 'Filter paidAt <= this ISO date' })
  @IsOptional()
  @IsDateString()
  paidTo?: string;
}
