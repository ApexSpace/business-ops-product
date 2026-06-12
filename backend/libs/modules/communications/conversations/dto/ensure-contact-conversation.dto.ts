import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationChannel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const ENSURE_CHANNELS = [
  ConversationChannel.EMAIL,
  ConversationChannel.WHATSAPP,
  ConversationChannel.FACEBOOK,
  ConversationChannel.INSTAGRAM,
] as const;

export class EnsureContactConversationDto {
  @ApiProperty({ enum: ENSURE_CHANNELS })
  @IsEnum(ENSURE_CHANNELS)
  channel!: (typeof ENSURE_CHANNELS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text?: string;
}
