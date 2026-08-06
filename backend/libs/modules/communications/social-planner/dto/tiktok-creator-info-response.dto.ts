import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TikTokCreatorInfoResponseDto {
  @ApiProperty()
  creatorAvatarUrl!: string;

  @ApiProperty()
  creatorUsername!: string;

  @ApiProperty()
  creatorNickname!: string;

  @ApiProperty({ type: [String] })
  privacyLevelOptions!: string[];

  @ApiProperty()
  commentDisabled!: boolean;

  @ApiProperty()
  duetDisabled!: boolean;

  @ApiProperty()
  stitchDisabled!: boolean;

  @ApiPropertyOptional()
  maxVideoPostDurationSec?: number;
}
