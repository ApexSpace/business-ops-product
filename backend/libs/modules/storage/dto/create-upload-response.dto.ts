import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadResponseDto {
  @ApiProperty()
  fileAssetId!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;
}
