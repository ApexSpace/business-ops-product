import { ApiProperty } from '@nestjs/swagger';
import { FileCategory, FileVisibility } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_FILE_SIZE } from '../constants/storage.constants';

export class CreateUploadDto {
  @ApiProperty({ example: 'invoice.pdf' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  mimeType!: string;

  @ApiProperty({ example: 102400 })
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE)
  size!: number;

  @ApiProperty({ enum: FileCategory })
  @IsEnum(FileCategory)
  category!: FileCategory;

  @ApiProperty({ enum: FileVisibility, default: FileVisibility.PRIVATE })
  @IsEnum(FileVisibility)
  visibility!: FileVisibility;
}
