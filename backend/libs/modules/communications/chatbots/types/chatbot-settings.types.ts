import { ChatbotWidgetPosition } from '@prisma/client';

export type ChatbotPlacement = ChatbotWidgetPosition;

export interface ChatbotAppearanceSettings {
  placement: ChatbotPlacement;
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor?: string | null;
  avatarUrl?: string | null;
  launcherIcon?: 'message' | 'chat' | 'help';
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  showBranding: boolean;
  consentEnabled: boolean;
  consentText?: string | null;
}

export interface ChatbotChatWindowSettings {
  language: string;
  title: string;
  introMessage: string;
  offlineMessage: string;
  handoffMessage: string;
  liveChatEnabled: boolean;
  acknowledgementMessage: string;
}

export interface ChatbotMessagingSettings {
  welcomeMessage: string;
  fallbackMessage: string;
  offlineMessage: string;
  autoReplyEnabled: boolean;
  aiEnabled: boolean;
  businessHoursOnly: boolean;
}

export interface ChatbotBusinessHoursSettings {
  enabled: boolean;
  timezone: string;
  /** ISO weekday 1 (Mon) – 7 (Sun) → intervals */
  schedule: Record<
    string,
    { start: string; end: string }[]
  >;
}

export interface ChatbotFormSettings {
  collectContactInfo: boolean;
  requireName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  showNotesField: boolean;
  allowAnonymous: boolean;
}

export interface ChatbotBotSettings {
  embedEnabled: boolean;
  knowledgeBaseText?: string | null;
}

export interface ChatbotSettingsBundle {
  appearance: ChatbotAppearanceSettings;
  chatWindow: ChatbotChatWindowSettings;
  messaging: ChatbotMessagingSettings;
  businessHours: ChatbotBusinessHoursSettings;
  form: ChatbotFormSettings;
  bot: ChatbotBotSettings;
}

/** Flat view used by services, mappers, and auto-reply. */
export interface ChatbotSettingsView extends ChatbotSettingsBundle {
  widgetTitle: string;
}
