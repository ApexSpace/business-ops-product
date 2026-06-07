import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ChatbotRuleTriggerType,
  ChatbotStatus,
  ChatbotWidgetPosition,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChatbotDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  widgetTitle!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  welcomeMessage!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fallbackMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  offlineMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  handoffMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;

  @ApiPropertyOptional({ enum: ChatbotWidgetPosition })
  @IsOptional()
  @IsEnum(ChatbotWidgetPosition)
  position?: ChatbotWidgetPosition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  collectContactInfo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requirePhone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showNotesField?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showBranding?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  embedEnabled?: boolean;
}

export class UpdateChatbotDto extends PartialType(CreateChatbotDto) {
  @ApiPropertyOptional({ enum: ChatbotStatus })
  @IsOptional()
  @IsEnum(ChatbotStatus)
  status?: ChatbotStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;
}

export class CreateChatbotRuleDto {
  @ApiProperty({ enum: ChatbotRuleTriggerType })
  @IsEnum(ChatbotRuleTriggerType)
  triggerType!: ChatbotRuleTriggerType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  triggerText!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  responseText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateChatbotRuleDto extends PartialType(CreateChatbotRuleDto) {}

export class StartChatbotSessionDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  visitorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  visitorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(254)
  visitorEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  visitorPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  initialMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  referrer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}

export class SendChatbotMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;
}

export class ListChatbotsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
