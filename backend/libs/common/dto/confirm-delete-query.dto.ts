import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsBoolean } from 'class-validator';

export class ConfirmDeleteQueryDto {
  @ApiProperty({
    description: 'Must be true to confirm deletion',
    enum: [true],
    example: true,
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @Equals(true, { message: 'Pass confirm=true to delete' })
  confirm!: boolean;
}
