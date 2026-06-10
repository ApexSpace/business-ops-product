import { ApiPropertyOptional } from '@nestjs/swagger';
import { CapabilityStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListCapabilitiesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CapabilityStatus })
  @IsOptional()
  @IsEnum(CapabilityStatus)
  status?: CapabilityStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
