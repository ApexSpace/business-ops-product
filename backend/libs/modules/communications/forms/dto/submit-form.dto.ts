import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitFormDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Required when the form includes Collect Payment',
  })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;
}
