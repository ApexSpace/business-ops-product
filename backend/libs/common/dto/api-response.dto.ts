import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty()
  timestamp: string;
}

export class PaginatedMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: T[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty()
  timestamp: string;
}
