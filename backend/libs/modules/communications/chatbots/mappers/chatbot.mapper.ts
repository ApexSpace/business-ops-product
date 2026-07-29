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
  buildFrontendChatbotWidgetUrl,
} from '../utils/chatbot-public-key.util';
import { isChatbotOnline } from '../utils/chatbot-business-hours.util';

export function toChatbotRuleResponse(
  rule: ChatbotRule,
): ChatbotRuleResponseDto {
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
  extras?: {
    conversationsCount?: number;
    lastMessageAt?: Date | null;
    sessionsCount?: number;
    activeSessionsCount?: number;
    convertedSessionsCount?: number;
  },
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
    collectPhoneWhenOffline: settings.form.collectPhoneWhenOffline,
    allowedDomains: settings.bot.allowedDomains,
    consentEnabled: settings.appearance.consentEnabled,
    consentText: settings.appearance.consentText ?? null,
    launcherIcon: settings.appearance.launcherIcon ?? 'message',
    welcomeVariants: settings.bot.welcomeVariants ?? [],
    progressiveProfilingEnabled:
      settings.form.progressiveProfiling?.enabled ?? false,
    progressiveProfilingAskAfterMessages:
      settings.form.progressiveProfiling?.askEmailAfterMessages ?? 2,
    progressiveProfilingPromptMessage:
      settings.form.progressiveProfiling?.promptMessage ?? undefined,
    createdAt: chatbot.createdAt.toISOString(),
    updatedAt: chatbot.updatedAt.toISOString(),
    conversationsCount: extras?.conversationsCount,
    lastMessageAt: extras?.lastMessageAt?.toISOString() ?? null,
    sessionsCount: extras?.sessionsCount,
    activeSessionsCount: extras?.activeSessionsCount,
    convertedSessionsCount: extras?.convertedSessionsCount,
  };
}

export function toPublicChatbotConfig(
  chatbot: Chatbot,
  businessName: string,
): PublicChatbotConfigDto {
  const settings = parseChatbotSettings(chatbot);
  const isOnline = isChatbotOnline(settings.businessHours, settings.messaging);
  const requiresPhoneCapture =
    !isOnline &&
    settings.form.collectPhoneWhenOffline &&
    settings.form.collectContactInfo;
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
    requirePhone: requiresPhoneCapture || settings.form.requirePhone,
    showNotesField: settings.form.showNotesField,
    allowAnonymous: requiresPhoneCapture ? false : settings.form.allowAnonymous,
    showBranding: settings.appearance.showBranding,
    acknowledgementMessage: settings.chatWindow.acknowledgementMessage,
    businessName,
    isOnline,
    requiresPhoneCapture,
    consentEnabled: settings.appearance.consentEnabled,
    consentText: settings.appearance.consentText ?? null,
    launcherIcon: settings.appearance.launcherIcon ?? 'message',
    offsetX: settings.appearance.offsetX,
    offsetY: settings.appearance.offsetY,
  };
}

export function toChatbotEmbed(
  backendPublicUrl: string,
  frontendUrl: string,
  publicKey: string,
  options?: {
    position?: 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
    launcherIcon?: 'message' | 'chat' | 'help';
    primaryColor?: string;
  },
): ChatbotEmbedResponseDto {
  const widgetUrl = buildFrontendChatbotWidgetUrl(frontendUrl, publicKey);
  const scriptUrl = buildChatbotScriptUrl(backendPublicUrl);
  const widgetBase = frontendUrl.replace(/\/$/, '');
  const position = options?.position === 'BOTTOM_LEFT' ? 'left' : 'right';
  const launcherIcon = options?.launcherIcon ?? 'message';
  const primaryColor = options?.primaryColor ?? '#2563eb';
  const attrs = [
    `src="${scriptUrl}"`,
    `data-chatbot-key="${publicKey}"`,
    `data-widget-base="${widgetBase}"`,
    `data-position="${position}"`,
    `data-launcher-icon="${launcherIcon}"`,
    `data-primary-color="${primaryColor}"`,
    'async',
  ].join(' ');
  const embedCode = `<script ${attrs}></script>`;
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
  requiresProfile?: 'email' | 'name' | 'phone' | null;
}): PublicChatbotMessageDto {
  return {
    id: params.id,
    direction: params.direction,
    senderType: params.senderType,
    text: params.text,
    createdAt: params.createdAt.toISOString(),
    requiresProfile: params.requiresProfile ?? null,
  };
}
