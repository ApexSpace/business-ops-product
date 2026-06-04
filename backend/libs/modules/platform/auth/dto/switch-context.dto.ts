import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class SwitchContextDto {
  @ApiProperty({ enum: ['platform', 'business'] })
  @IsIn(['platform', 'business'])
  type!: 'platform' | 'business';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  businessId?: string;
}
