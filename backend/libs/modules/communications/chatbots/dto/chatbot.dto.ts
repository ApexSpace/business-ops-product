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
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsArray,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ChatbotBusinessHoursIntervalDto {
  @ApiProperty()
  @IsString()
  @MaxLength(8)
  start!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(8)
  end!: string;
}

export class ChatbotBusinessHoursSettingsUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/ChatbotBusinessHoursIntervalDto' },
    },
  })
  @IsOptional()
  @IsObject()
  schedule?: Record<string, ChatbotBusinessHoursIntervalDto[]>;
}

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  consentEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  consentText?: string;

  @ApiPropertyOptional({ enum: ['message', 'chat', 'help'] })
  @IsOptional()
  @IsString()
  launcherIcon?: 'message' | 'chat' | 'help';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  collectPhoneWhenOffline?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsString({ each: true })
  allowedDomains?: string[];
}

export class ChatbotWelcomeVariantDto {
  @ApiProperty({ enum: ['page_url', 'referrer'] })
  @IsString()
  matchType!: 'page_url' | 'referrer';

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  pattern!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  message!: string;
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

  @ApiPropertyOptional({ type: ChatbotBusinessHoursSettingsUpdateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatbotBusinessHoursSettingsUpdateDto)
  businessHoursSettings?: ChatbotBusinessHoursSettingsUpdateDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  progressiveProfilingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  progressiveProfilingAskAfterMessages?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  progressiveProfilingPromptMessage?: string;

  @ApiPropertyOptional({ type: [ChatbotWelcomeVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatbotWelcomeVariantDto)
  welcomeVariants?: ChatbotWelcomeVariantDto[];
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

export class ReorderChatbotRulesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  ruleIds!: string[];
}

export class PreviewChatbotRuleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;
}

export class ImportChatbotRulesDto {
  @ApiProperty({ type: [CreateChatbotRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChatbotRuleDto)
  rules!: CreateChatbotRuleDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}

export class UpdateChatbotSessionProfileDto {
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
}

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

  /** Optional access JWT for Scenario C (authenticated start). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  authToken?: string;
}

export class ClaimChatbotSessionDto {
  @ApiPropertyOptional({
    description: 'Access JWT; may also be sent as Authorization Bearer header',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  authToken?: string;
}

export class SendChatbotMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;
}

export class ListChatbotsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ChatbotStatus })
  @IsOptional()
  @IsEnum(ChatbotStatus)
  status?: ChatbotStatus;
}
