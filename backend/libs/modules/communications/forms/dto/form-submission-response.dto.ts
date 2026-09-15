import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FormSubmissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  success!: true;

  @ApiPropertyOptional({ nullable: true })
  redirectUrl?: string | null;
}
