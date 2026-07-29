import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateContactAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ minimum: 5, maximum: 480 })
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;
}

export class UpdateContactAdjustmentDto {
  @ApiProperty({ minimum: 5, maximum: 480 })
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;
}

export class ContactAdjustmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contactId!: string;

  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
