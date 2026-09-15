import { ApiProperty } from '@nestjs/swagger';

export class SignedDownloadResponseDto {
  @ApiProperty()
  downloadUrl!: string;

  @ApiProperty({ example: 300 })
  expiresIn!: number;
}
