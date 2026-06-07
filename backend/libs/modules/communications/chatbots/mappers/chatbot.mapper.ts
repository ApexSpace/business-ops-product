import { Chatbot, ChatbotRule } from '@prisma/client';
import {
  ChatbotAppearanceSettingsDto,
  ChatbotBotSettingsDto,
  ChatbotBusinessHoursSettingsDto,
  ChatbotChatWindowSettingsDto,
  ChatbotEmbedResponseDto,
  ChatbotFormSettingsDto,
  ChatbotMessagingSettingsDto,
  ChatbotResponseDto,
  ChatbotRuleResponseDto,
  PublicChatbotConfigDto,
  PublicChatbotMessageDto,
} from '../dto/chatbot-response.dto';
import { ChatbotSettingsView } from '../types/chatbot-settings.types';
import {
  parseChatbotSettings,
  placementLabel,
} from '../utils/chatbot-settings.util';
import {
  buildChatbotScriptUrl,
  buildChatbotWidgetUrl,
} from '../utils/chatbot-public-key.util';

export function toChatbotRuleResponse(rule: ChatbotRule): ChatbotRuleResponseDto {
  return {
    id: rule.id,
    triggerType: rule.triggerType,
    triggerText: rule.triggerText,
    responseText: rule.responseText,
    sortOrder: rule.sortOrder,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function toAppearanceDto(
  s: ChatbotSettingsView['appearance'],
): ChatbotAppearanceSettingsDto {
  return { ...s };
}

function toChatWindowDto(
  s: ChatbotSettingsView['chatWindow'],
): ChatbotChatWindowSettingsDto {
  return { ...s };
}

function toMessagingDto(
  s: ChatbotSettingsView['messaging'],
): ChatbotMessagingSettingsDto {
  return { ...s };
}

function toBusinessHoursDto(
  s: ChatbotSettingsView['businessHours'],
): ChatbotBusinessHoursSettingsDto {
  return { ...s };
}

function toFormDto(s: ChatbotSettingsView['form']): ChatbotFormSettingsDto {
  return { ...s };
}

function toBotDto(s: ChatbotSettingsView['bot']): ChatbotBotSettingsDto {
  return { ...s };
}

export function toChatbotResponse(
  chatbot: Chatbot,
  extras?: { conversationsCount?: number; lastMessageAt?: Date | null },
): ChatbotResponseDto {
  const settings = parseChatbotSettings(chatbot);
  return {
    id: chatbot.id,
    name: chatbot.name,
    status: chatbot.status,
    publicKey: chatbot.publicKey,
    description: chatbot.description,
    appearanceSettings: toAppearanceDto(settings.appearance),
    chatWindowSettings: toChatWindowDto(settings.chatWindow),
    messagingSettings: toMessagingDto(settings.messaging),
    businessHoursSettings: toBusinessHoursDto(settings.businessHours),
    formSettings: toFormDto(settings.form),
    botSettings: toBotDto(settings.bot),
    placement: settings.appearance.placement,
    placementLabel: placementLabel(settings.appearance.placement),
    widgetTitle: settings.chatWindow.title,
    welcomeMessage: settings.messaging.welcomeMessage,
    fallbackMessage: settings.messaging.fallbackMessage,
    offlineMessage: settings.messaging.offlineMessage,
    handoffMessage: settings.chatWindow.handoffMessage,
    primaryColor: settings.appearance.primaryColor,
    position: settings.appearance.placement,
    avatarUrl: settings.appearance.avatarUrl ?? null,
    collectContactInfo: settings.form.collectContactInfo,
    requireName: settings.form.requireName,
    requireEmail: settings.form.requireEmail,
    requirePhone: settings.form.requirePhone,
    showNotesField: settings.form.showNotesField,
    allowAnonymous: settings.form.allowAnonymous,
    autoReplyEnabled: settings.messaging.autoReplyEnabled,
    aiEnabled: settings.messaging.aiEnabled,
    businessHoursOnly: settings.messaging.businessHoursOnly,
    showBranding: settings.appearance.showBranding,
    embedEnabled: settings.bot.embedEnabled,
    createdAt: chatbot.createdAt.toISOString(),
    updatedAt: chatbot.updatedAt.toISOString(),
    conversationsCount: extras?.conversationsCount,
    lastMessageAt: extras?.lastMessageAt?.toISOString() ?? null,
  };
}

export function toPublicChatbotConfig(
  chatbot: Chatbot,
  businessName: string,
): PublicChatbotConfigDto {
  const settings = parseChatbotSettings(chatbot);
  return {
    publicKey: chatbot.publicKey,
    widgetTitle: settings.chatWindow.title,
    welcomeMessage: settings.messaging.welcomeMessage,
    offlineMessage: settings.messaging.offlineMessage,
    avatarUrl: settings.appearance.avatarUrl ?? null,
    primaryColor: settings.appearance.primaryColor,
    position: settings.appearance.placement,
    collectContactInfo: settings.form.collectContactInfo,
    requireName: settings.form.requireName,
    requireEmail: settings.form.requireEmail,
    requirePhone: settings.form.requirePhone,
    showNotesField: settings.form.showNotesField,
    allowAnonymous: settings.form.allowAnonymous,
    showBranding: settings.appearance.showBranding,
    acknowledgementMessage: settings.chatWindow.acknowledgementMessage,
    businessName,
  };
}

export function toChatbotEmbed(
  backendPublicUrl: string,
  publicKey: string,
): ChatbotEmbedResponseDto {
  const widgetUrl = buildChatbotWidgetUrl(backendPublicUrl, publicKey);
  const scriptUrl = buildChatbotScriptUrl(backendPublicUrl);
  const embedCode = `<script src="${scriptUrl}" data-chatbot-key="${publicKey}" async></script>`;
  const iframeEmbed = `<iframe src="${widgetUrl}" style="border:0;width:380px;height:600px;position:fixed;bottom:20px;right:20px;z-index:9999;border-radius:16px;" title="Chat"></iframe>`;
  return {
    publicKey,
    scriptUrl,
    widgetUrl,
    embedCode,
    embedScript: embedCode,
    iframeEmbed,
  };
}

export function toPublicChatbotMessage(params: {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: string;
  text: string | null;
  createdAt: Date;
}): PublicChatbotMessageDto {
  return {
    id: params.id,
    direction: params.direction,
    senderType: params.senderType,
    text: params.text,
    createdAt: params.createdAt.toISOString(),
  };
}
