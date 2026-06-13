import { ApiProperty } from '@nestjs/swagger';
import { FileAssetStatus, FileCategory, FileVisibility } from '@prisma/client';

export class FileAssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty({ enum: FileCategory })
  category!: FileCategory;

  @ApiProperty({ enum: FileAssetStatus })
  status!: FileAssetStatus;

  @ApiProperty({ enum: FileVisibility })
  visibility!: FileVisibility;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
