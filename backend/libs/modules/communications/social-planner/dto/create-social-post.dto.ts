import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateSocialPostTargetDto {
  @ApiProperty({ example: 'facebook' })
  @IsString()
  @MaxLength(50)
  providerKey!: string;

  @ApiPropertyOptional({
    description: 'IntegrationResource id (page/channel/board/account).',
  })
  @IsOptional()
  @IsUUID('4')
  integrationResourceId?: string;

  @ApiPropertyOptional({ example: 'FEED' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  postType?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  platformPayload?: Record<string, unknown>;
}

export class CreateSocialPostDto {
  @ApiProperty()
  @IsString()
  @MaxLength(63206)
  caption!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(25)
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(10)
  mediaFileAssetIds?: string[];

  @ApiProperty({ type: [CreateSocialPostTargetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSocialPostTargetDto)
  targets!: CreateSocialPostTargetDto[];
}
