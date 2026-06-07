import {
  ChatbotRuleTriggerType,
  ChatbotStatus,
  ChatbotWidgetPosition,
} from '@prisma/client';
import type {
  ChatbotAppearanceSettings,
  ChatbotBotSettings,
  ChatbotBusinessHoursSettings,
  ChatbotChatWindowSettings,
  ChatbotFormSettings,
  ChatbotMessagingSettings,
} from '../types/chatbot-settings.types';

export class ChatbotRuleResponseDto {
  id!: string;
  triggerType!: ChatbotRuleTriggerType;
  triggerText!: string;
  responseText!: string;
  sortOrder!: number;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;
}

export type ChatbotAppearanceSettingsDto = ChatbotAppearanceSettings;
export type ChatbotChatWindowSettingsDto = ChatbotChatWindowSettings;
export type ChatbotMessagingSettingsDto = ChatbotMessagingSettings;
export type ChatbotBusinessHoursSettingsDto = ChatbotBusinessHoursSettings;
export type ChatbotFormSettingsDto = ChatbotFormSettings;
export type ChatbotBotSettingsDto = ChatbotBotSettings;

export class ChatbotResponseDto {
  id!: string;
  name!: string;
  status!: ChatbotStatus;
  publicKey!: string;
  description!: string | null;
  appearanceSettings!: ChatbotAppearanceSettingsDto;
  chatWindowSettings!: ChatbotChatWindowSettingsDto;
  messagingSettings!: ChatbotMessagingSettingsDto;
  businessHoursSettings!: ChatbotBusinessHoursSettingsDto;
  formSettings!: ChatbotFormSettingsDto;
  botSettings!: ChatbotBotSettingsDto;
  placement!: ChatbotWidgetPosition;
  placementLabel!: string;
  /** Flat fields for forms and backwards compatibility */
  widgetTitle!: string;
  welcomeMessage!: string;
  fallbackMessage!: string;
  offlineMessage!: string;
  handoffMessage!: string;
  primaryColor!: string;
  position!: ChatbotWidgetPosition;
  avatarUrl!: string | null;
  collectContactInfo!: boolean;
  requireName!: boolean;
  requireEmail!: boolean;
  requirePhone!: boolean;
  showNotesField!: boolean;
  allowAnonymous!: boolean;
  autoReplyEnabled!: boolean;
  aiEnabled!: boolean;
  businessHoursOnly!: boolean;
  showBranding!: boolean;
  embedEnabled!: boolean;
  createdAt!: string;
  updatedAt!: string;
  conversationsCount?: number;
  lastMessageAt?: string | null;
}

export class ChatbotEmbedResponseDto {
  publicKey!: string;
  scriptUrl!: string;
  widgetUrl!: string;
  embedCode!: string;
  /** @deprecated Use embedCode */
  embedScript!: string;
  iframeEmbed!: string;
}

export class PublicChatbotConfigDto {
  publicKey!: string;
  widgetTitle!: string;
  welcomeMessage!: string;
  offlineMessage!: string;
  avatarUrl!: string | null;
  primaryColor!: string;
  position!: ChatbotWidgetPosition;
  collectContactInfo!: boolean;
  requireName!: boolean;
  requireEmail!: boolean;
  requirePhone!: boolean;
  showNotesField!: boolean;
  allowAnonymous!: boolean;
  showBranding!: boolean;
  acknowledgementMessage!: string;
  businessName!: string;
}

export class PublicChatbotSessionDto {
  sessionId!: string;
  conversationId!: string;
}

export class PublicChatbotMessageDto {
  id!: string;
  direction!: 'INBOUND' | 'OUTBOUND';
  senderType!: string;
  text!: string | null;
  createdAt!: string;
}
