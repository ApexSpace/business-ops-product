import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class PinBodyDto {
  @ApiProperty({ example: '1234', description: '4-digit numeric PIN' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 numeric digits' })
  pin!: string;
}
