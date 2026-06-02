import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstimateStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListEstimatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactId?: string;

  @ApiPropertyOptional({ enum: EstimateStatus })
  @IsOptional()
  @IsEnum(EstimateStatus)
  status?: EstimateStatus;

  @ApiPropertyOptional({ description: 'Filter issueDate >= this ISO date' })
  @IsOptional()
  @IsDateString()
  issueFrom?: string;

  @ApiPropertyOptional({ description: 'Filter issueDate <= this ISO date' })
  @IsOptional()
  @IsDateString()
  issueTo?: string;
}
