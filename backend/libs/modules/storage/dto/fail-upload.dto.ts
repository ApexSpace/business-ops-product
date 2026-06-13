import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class FailUploadDto {
  @ApiProperty({ example: 'Upload aborted by client' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}
