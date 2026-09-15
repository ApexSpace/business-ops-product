import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GlobalSearchResultDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: ['contact', 'appointment', 'invoice', 'product'],
  })
  type!: 'contact' | 'appointment' | 'invoice' | 'product';

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  subtitle?: string;

  @ApiProperty()
  href!: string;
}

export class GlobalSearchResponseDto {
  @ApiProperty({ type: [GlobalSearchResultDto] })
  items!: GlobalSearchResultDto[];
}
