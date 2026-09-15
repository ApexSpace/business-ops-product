import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReplySocialCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message!: string;

  @ApiProperty({ example: 'facebook' })
  @IsString()
  @MaxLength(50)
  providerKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  socialPostTargetId?: string;
}

export class CommentActionQueryDto {
  @ApiProperty({ example: 'facebook' })
  @IsString()
  @MaxLength(50)
  providerKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  socialPostTargetId?: string;
}

export class MarkSocialCommentsReadDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ids?: string[];

  @ApiPropertyOptional({ example: 'instagram' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  providerKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  socialPostId?: string;
}
