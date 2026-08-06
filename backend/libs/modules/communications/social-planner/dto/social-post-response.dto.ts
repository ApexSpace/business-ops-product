import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SocialPostStatus,
  SocialPostTargetStatus,
} from '@prisma/client';

export class SocialPostMediaResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileAssetId!: string;

  @ApiPropertyOptional()
  thumbnailFileAssetId?: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  altText?: string | null;

  @ApiPropertyOptional()
  fileName?: string | null;

  @ApiPropertyOptional()
  mimeType?: string | null;
}

export class SocialPostTargetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  providerKey!: string;

  @ApiPropertyOptional()
  integrationResourceId?: string | null;

  @ApiPropertyOptional()
  resourceName?: string | null;

  @ApiProperty()
  postType!: string;

  @ApiProperty({ type: Object })
  platformPayload!: Record<string, unknown>;

  @ApiProperty({ enum: SocialPostTargetStatus })
  status!: SocialPostTargetStatus;

  @ApiPropertyOptional()
  scheduledAt?: Date | null;

  @ApiPropertyOptional()
  externalPostId?: string | null;

  @ApiPropertyOptional()
  permalink?: string | null;

  @ApiPropertyOptional()
  errorCode?: string | null;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiProperty()
  attemptCount!: number;

  @ApiPropertyOptional()
  publishedAt?: Date | null;

  @ApiProperty({ type: [SocialPostMediaResponseDto] })
  media!: SocialPostMediaResponseDto[];
}

export class SocialPostResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiPropertyOptional()
  createdByUserId?: string | null;

  @ApiProperty({ enum: SocialPostStatus })
  status!: SocialPostStatus;

  @ApiProperty()
  caption!: string;

  @ApiPropertyOptional()
  scheduledAt?: Date | null;

  @ApiPropertyOptional()
  timezone?: string | null;

  @ApiPropertyOptional()
  publishedAt?: Date | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [SocialPostMediaResponseDto] })
  media!: SocialPostMediaResponseDto[];

  @ApiProperty({ type: [SocialPostTargetResponseDto] })
  targets!: SocialPostTargetResponseDto[];
}
