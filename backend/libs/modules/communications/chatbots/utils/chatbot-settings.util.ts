import { Chatbot, ChatbotWidgetPosition, Prisma } from '@prisma/client';
import {
  ChatbotAppearanceSettings,
  ChatbotBotSettings,
  ChatbotBusinessHoursSettings,
  ChatbotChatWindowSettings,
  ChatbotFormSettings,
  ChatbotMessagingSettings,
  ChatbotSettingsBundle,
  ChatbotSettingsView,
} from '../types/chatbot-settings.types';
import type { CreateChatbotDto, UpdateChatbotDto } from '../dto/chatbot.dto';

export const DEFAULT_FALLBACK_MESSAGE =
  "Thanks for your message. We'll get back to you shortly.";
export const DEFAULT_OFFLINE_MESSAGE =
  "We're currently away. Leave a message and we'll respond soon.";
export const DEFAULT_HANDOFF_MESSAGE =
  "I'll connect you with our team. Someone will reply here shortly.";

const DEFAULT_APPEARANCE: ChatbotAppearanceSettings = {
  placement: ChatbotWidgetPosition.BOTTOM_RIGHT,
  theme: 'light',
  primaryColor: '#2563eb',
  secondaryColor: null,
  avatarUrl: null,
  launcherIcon: 'message',
  offsetX: 20,
  offsetY: 20,
  width: 380,
  height: 600,
  showBranding: true,
  consentEnabled: false,
  consentText: null,
};

const DEFAULT_CHAT_WINDOW: ChatbotChatWindowSettings = {
  language: 'en',
  title: 'Chat with us',
  introMessage: 'Hi there! How can we help you today?',
  offlineMessage: DEFAULT_OFFLINE_MESSAGE,
  handoffMessage: DEFAULT_HANDOFF_MESSAGE,
  liveChatEnabled: true,
  acknowledgementMessage: 'We typically reply soon',
};

const DEFAULT_MESSAGING: ChatbotMessagingSettings = {
  welcomeMessage: 'Hi there! How can we help you today?',
  fallbackMessage: DEFAULT_FALLBACK_MESSAGE,
  offlineMessage: DEFAULT_OFFLINE_MESSAGE,
  autoReplyEnabled: true,
  aiEnabled: false,
  businessHoursOnly: false,
};

const DEFAULT_BUSINESS_HOURS: ChatbotBusinessHoursSettings = {
  enabled: false,
  timezone: 'UTC',
  schedule: {},
};

const DEFAULT_FORM: ChatbotFormSettings = {
  collectContactInfo: true,
  requireName: true,
  requireEmail: false,
  requirePhone: false,
  showNotesField: false,
  allowAnonymous: true,
};

const DEFAULT_BOT: ChatbotBotSettings = {
  embedEnabled: true,
  knowledgeBaseText: null,
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickString(
  obj: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const v = obj[key];
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function pickBool(
  obj: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const v = obj[key];
  return typeof v === 'boolean' ? v : fallback;
}

function pickNumber(
  obj: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const v = obj[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function parsePlacement(value: unknown): ChatbotWidgetPosition {
  if (value === ChatbotWidgetPosition.BOTTOM_LEFT || value === 'BOTTOM_LEFT') {
    return ChatbotWidgetPosition.BOTTOM_LEFT;
  }
  return ChatbotWidgetPosition.BOTTOM_RIGHT;
}

export function defaultSettingsBundle(
  overrides?: Partial<{
    appearance: Partial<ChatbotAppearanceSettings>;
    chatWindow: Partial<ChatbotChatWindowSettings>;
    messaging: Partial<ChatbotMessagingSettings>;
    businessHours: Partial<ChatbotBusinessHoursSettings>;
    form: Partial<ChatbotFormSettings>;
    bot: Partial<ChatbotBotSettings>;
  }>,
): ChatbotSettingsBundle {
  return {
    appearance: { ...DEFAULT_APPEARANCE, ...overrides?.appearance },
    chatWindow: { ...DEFAULT_CHAT_WINDOW, ...overrides?.chatWindow },
    messaging: { ...DEFAULT_MESSAGING, ...overrides?.messaging },
    businessHours: {
      ...DEFAULT_BUSINESS_HOURS,
      ...overrides?.businessHours,
    },
    form: { ...DEFAULT_FORM, ...overrides?.form },
    bot: { ...DEFAULT_BOT, ...overrides?.bot },
  };
}

export function parseAppearanceSettings(
  raw: Prisma.JsonValue | null | undefined,
): ChatbotAppearanceSettings {
  const o = asObject(raw);
  return {
    placement: parsePlacement(o.placement),
    theme:
      o.theme === 'dark' || o.theme === 'auto' || o.theme === 'light'
        ? o.theme
        : DEFAULT_APPEARANCE.theme,
    primaryColor: pickString(
      o,
      'primaryColor',
      DEFAULT_APPEARANCE.primaryColor,
    ),
    secondaryColor:
      typeof o.secondaryColor === 'string' ? o.secondaryColor : null,
    avatarUrl: typeof o.avatarUrl === 'string' ? o.avatarUrl : null,
    launcherIcon:
      o.launcherIcon === 'chat' || o.launcherIcon === 'help'
        ? o.launcherIcon
        : 'message',
    offsetX: pickNumber(o, 'offsetX', DEFAULT_APPEARANCE.offsetX),
    offsetY: pickNumber(o, 'offsetY', DEFAULT_APPEARANCE.offsetY),
    width: pickNumber(o, 'width', DEFAULT_APPEARANCE.width),
    height: pickNumber(o, 'height', DEFAULT_APPEARANCE.height),
    showBranding: pickBool(o, 'showBranding', DEFAULT_APPEARANCE.showBranding),
    consentEnabled: pickBool(o, 'consentEnabled', false),
    consentText: typeof o.consentText === 'string' ? o.consentText : null,
  };
}

export function parseChatWindowSettings(
  raw: Prisma.JsonValue | null | undefined,
): ChatbotChatWindowSettings {
  const o = asObject(raw);
  return {
    language: pickString(o, 'language', DEFAULT_CHAT_WINDOW.language),
    title: pickString(o, 'title', DEFAULT_CHAT_WINDOW.title),
    introMessage: pickString(
      o,
      'introMessage',
      DEFAULT_CHAT_WINDOW.introMessage,
    ),
    offlineMessage: pickString(
      o,
      'offlineMessage',
      DEFAULT_CHAT_WINDOW.offlineMessage,
    ),
    handoffMessage: pickString(
      o,
      'handoffMessage',
      DEFAULT_CHAT_WINDOW.handoffMessage,
    ),
    liveChatEnabled: pickBool(o, 'liveChatEnabled', true),
    acknowledgementMessage: pickString(
      o,
      'acknowledgementMessage',
      DEFAULT_CHAT_WINDOW.acknowledgementMessage,
    ),
  };
}

export function parseMessagingSettings(
  raw: Prisma.JsonValue | null | undefined,
): ChatbotMessagingSettings {
  const o = asObject(raw);
  return {
    welcomeMessage: pickString(
      o,
      'welcomeMessage',
      DEFAULT_MESSAGING.welcomeMessage,
    ),
    fallbackMessage: pickString(
      o,
      'fallbackMessage',
      DEFAULT_MESSAGING.fallbackMessage,
    ),
    offlineMessage: pickString(
      o,
      'offlineMessage',
      DEFAULT_MESSAGING.offlineMessage,
    ),
    autoReplyEnabled: pickBool(o, 'autoReplyEnabled', true),
    aiEnabled: pickBool(o, 'aiEnabled', false),
    businessHoursOnly: pickBool(o, 'businessHoursOnly', false),
  };
}

export function parseBusinessHoursSettings(
  raw: Prisma.JsonValue | null | undefined,
): ChatbotBusinessHoursSettings {
  const o = asObject(raw);
  const schedule =
    o.schedule && typeof o.schedule === 'object' && !Array.isArray(o.schedule)
      ? (o.schedule as ChatbotBusinessHoursSettings['schedule'])
      : {};
  return {
    enabled: pickBool(o, 'enabled', false),
    timezone: pickString(o, 'timezone', 'UTC'),
    schedule,
  };
}

export function parseFormSettings(
  raw: Prisma.JsonValue | null | undefined,
): ChatbotFormSettings {
  const o = asObject(raw);
  return {
    collectContactInfo: pickBool(o, 'collectContactInfo', true),
    requireName: pickBool(o, 'requireName', true),
    requireEmail: pickBool(o, 'requireEmail', false),
    requirePhone: pickBool(o, 'requirePhone', false),
    showNotesField: pickBool(o, 'showNotesField', false),
    allowAnonymous: pickBool(o, 'allowAnonymous', true),
  };
}

export function parseBotSettings(
  raw: Prisma.JsonValue | null | undefined,
): ChatbotBotSettings {
  const o = asObject(raw);
  return {
    embedEnabled: pickBool(o, 'embedEnabled', true),
    knowledgeBaseText:
      typeof o.knowledgeBaseText === 'string' ? o.knowledgeBaseText : null,
  };
}

export function parseChatbotSettings(chatbot: Chatbot): ChatbotSettingsView {
  const appearance = parseAppearanceSettings(chatbot.appearanceSettings);
  const chatWindow = parseChatWindowSettings(chatbot.chatWindowSettings);
  const messaging = parseMessagingSettings(chatbot.messagingSettings);
  const businessHours = parseBusinessHoursSettings(
    chatbot.businessHoursSettings,
  );
  const form = parseFormSettings(chatbot.formSettings);
  const bot = parseBotSettings(chatbot.botSettings);

  return {
    appearance,
    chatWindow,
    messaging,
    businessHours,
    form,
    bot,
    widgetTitle: chatWindow.title,
  };
}

export function settingsToJson(
  bundle: ChatbotSettingsBundle,
): Pick<
  Prisma.ChatbotCreateInput,
  | 'appearanceSettings'
  | 'chatWindowSettings'
  | 'messagingSettings'
  | 'businessHoursSettings'
  | 'formSettings'
  | 'botSettings'
> {
  return {
    appearanceSettings: bundle.appearance as unknown as Prisma.InputJsonValue,
    chatWindowSettings: bundle.chatWindow as unknown as Prisma.InputJsonValue,
    messagingSettings: bundle.messaging as unknown as Prisma.InputJsonValue,
    businessHoursSettings:
      bundle.businessHours as unknown as Prisma.InputJsonValue,
    formSettings: bundle.form as unknown as Prisma.InputJsonValue,
    botSettings: bundle.bot as unknown as Prisma.InputJsonValue,
  };
}

export function bundleFromCreateDto(
  dto: CreateChatbotDto,
): ChatbotSettingsBundle {
  const defaults = defaultSettingsBundle();
  return {
    appearance: {
      ...defaults.appearance,
      primaryColor: dto.primaryColor ?? defaults.appearance.primaryColor,
      placement: dto.position ?? defaults.appearance.placement,
      avatarUrl: dto.avatarUrl ?? null,
      showBranding: dto.showBranding ?? defaults.appearance.showBranding,
    },
    chatWindow: {
      ...defaults.chatWindow,
      title: dto.widgetTitle.trim(),
      introMessage: dto.welcomeMessage.trim(),
      offlineMessage:
        dto.offlineMessage?.trim() ?? defaults.chatWindow.offlineMessage,
      handoffMessage:
        dto.handoffMessage?.trim() ?? defaults.chatWindow.handoffMessage,
    },
    messaging: {
      ...defaults.messaging,
      welcomeMessage: dto.welcomeMessage.trim(),
      fallbackMessage:
        dto.fallbackMessage?.trim() ?? defaults.messaging.fallbackMessage,
      offlineMessage:
        dto.offlineMessage?.trim() ?? defaults.messaging.offlineMessage,
      autoReplyEnabled:
        dto.autoReplyEnabled ?? defaults.messaging.autoReplyEnabled,
    },
    form: {
      ...defaults.form,
      collectContactInfo:
        dto.collectContactInfo ?? defaults.form.collectContactInfo,
      requireName: dto.requireName ?? defaults.form.requireName,
      requireEmail: dto.requireEmail ?? defaults.form.requireEmail,
      requirePhone: dto.requirePhone ?? defaults.form.requirePhone,
      showNotesField: dto.showNotesField ?? defaults.form.showNotesField,
      allowAnonymous: dto.allowAnonymous ?? defaults.form.allowAnonymous,
    },
    businessHours: defaults.businessHours,
    bot: {
      ...defaults.bot,
      embedEnabled: dto.embedEnabled ?? defaults.bot.embedEnabled,
    },
  };
}

export function mergeUpdateDto(
  current: ChatbotSettingsView,
  dto: UpdateChatbotDto,
): ChatbotSettingsBundle {
  const appearance = { ...current.appearance };
  const chatWindow = { ...current.chatWindow };
  const messaging = { ...current.messaging };
  const form = { ...current.form };
  const bot = { ...current.bot };
  const businessHours = { ...current.businessHours };

  if (dto.primaryColor !== undefined)
    appearance.primaryColor = dto.primaryColor;
  if (dto.position !== undefined) appearance.placement = dto.position;
  if (dto.avatarUrl !== undefined) appearance.avatarUrl = dto.avatarUrl ?? null;
  if (dto.showBranding !== undefined)
    appearance.showBranding = dto.showBranding;

  if (dto.widgetTitle !== undefined) chatWindow.title = dto.widgetTitle.trim();
  if (dto.welcomeMessage !== undefined) {
    chatWindow.introMessage = dto.welcomeMessage.trim();
    messaging.welcomeMessage = dto.welcomeMessage.trim();
  }
  if (dto.offlineMessage !== undefined) {
    chatWindow.offlineMessage = dto.offlineMessage.trim();
    messaging.offlineMessage = dto.offlineMessage.trim();
  }
  if (dto.handoffMessage !== undefined) {
    chatWindow.handoffMessage = dto.handoffMessage.trim();
  }
  if (dto.fallbackMessage !== undefined) {
    messaging.fallbackMessage = dto.fallbackMessage.trim();
  }
  if (dto.autoReplyEnabled !== undefined) {
    messaging.autoReplyEnabled = dto.autoReplyEnabled;
  }
  if (dto.aiEnabled !== undefined) messaging.aiEnabled = dto.aiEnabled;
  if (dto.businessHoursOnly !== undefined) {
    messaging.businessHoursOnly = dto.businessHoursOnly;
    businessHours.enabled = dto.businessHoursOnly;
  }

  if (dto.collectContactInfo !== undefined) {
    form.collectContactInfo = dto.collectContactInfo;
  }
  if (dto.requireName !== undefined) form.requireName = dto.requireName;
  if (dto.requireEmail !== undefined) form.requireEmail = dto.requireEmail;
  if (dto.requirePhone !== undefined) form.requirePhone = dto.requirePhone;
  if (dto.showNotesField !== undefined)
    form.showNotesField = dto.showNotesField;
  if (dto.allowAnonymous !== undefined)
    form.allowAnonymous = dto.allowAnonymous;
  if (dto.embedEnabled !== undefined) bot.embedEnabled = dto.embedEnabled;

  return {
    appearance,
    chatWindow,
    messaging,
    businessHours,
    form,
    bot,
  };
}

export function placementLabel(placement: ChatbotWidgetPosition): string {
  return placement === ChatbotWidgetPosition.BOTTOM_LEFT
    ? 'Bottom left'
    : 'Bottom right';
}
