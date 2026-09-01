import { api } from "@/lib/api/client";
import type { ChatbotBusinessHoursSettings } from "@/features/chatbots/utils/chatbot-business-hours.util";

export type ChatbotStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";
export type ChatbotPosition = "BOTTOM_RIGHT" | "BOTTOM_LEFT";
export type ChatbotRuleTriggerType =
  | "EXACT_MATCH"
  | "CONTAINS"
  | "STARTS_WITH"
  | "FALLBACK";

export interface ChatbotWelcomeVariant {
  matchType: "page_url" | "referrer";
  pattern: string;
  message: string;
}

export interface Chatbot {
  id: string;
  name: string;
  status: ChatbotStatus;
  publicKey: string;
  description: string | null;
  avatarUrl: string | null;
  widgetTitle: string;
  welcomeMessage: string;
  fallbackMessage: string;
  offlineMessage: string;
  handoffMessage: string;
  primaryColor: string;
  position: ChatbotPosition;
  placement?: ChatbotPosition;
  placementLabel?: string;
  collectContactInfo: boolean;
  requireName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  showNotesField: boolean;
  allowAnonymous: boolean;
  autoReplyEnabled: boolean;
  aiEnabled: boolean;
  businessHoursOnly: boolean;
  businessHoursSettings?: ChatbotBusinessHoursSettings;
  showBranding: boolean;
  embedEnabled: boolean;
  collectPhoneWhenOffline?: boolean;
  allowedDomains?: string[];
  consentEnabled?: boolean;
  consentText?: string | null;
  launcherIcon?: "message" | "chat" | "help";
  welcomeVariants?: ChatbotWelcomeVariant[];
  progressiveProfilingEnabled?: boolean;
  progressiveProfilingAskAfterMessages?: number;
  progressiveProfilingPromptMessage?: string | null;
  acknowledgementMessage?: string;
  liveChatEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  conversationsCount?: number;
  lastMessageAt?: string | null;
  sessionsCount?: number;
  activeSessionsCount?: number;
  convertedSessionsCount?: number;
}

export interface ChatbotRule {
  id: string;
  triggerType: ChatbotRuleTriggerType;
  triggerText: string;
  responseText: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotEmbed {
  publicKey: string;
  scriptUrl: string;
  widgetUrl: string;
  embedCode: string;
  embedScript: string;
  iframeEmbed: string;
}

export type CreateChatbotBody = {
  name: string;
  widgetTitle: string;
  welcomeMessage: string;
  fallbackMessage?: string;
  offlineMessage?: string;
  handoffMessage?: string;
  primaryColor?: string;
  position?: ChatbotPosition;
  collectContactInfo?: boolean;
  requireName?: boolean;
  requireEmail?: boolean;
  requirePhone?: boolean;
  showNotesField?: boolean;
  allowAnonymous?: boolean;
  autoReplyEnabled?: boolean;
  showBranding?: boolean;
  embedEnabled?: boolean;
  consentEnabled?: boolean;
  consentText?: string;
  launcherIcon?: "message" | "chat" | "help";
  collectPhoneWhenOffline?: boolean;
  allowedDomains?: string[];
};

const DEFAULT_API_BASE = "chatbots";

function path(apiBase: string, ...segments: string[]) {
  return [apiBase, ...segments].filter(Boolean).join("/");
}

export function listChatbots(
  params?: { page?: number; limit?: number },
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.getPaginated<Chatbot>(apiBase, { searchParams: params });
}

export function getChatbot(id: string, apiBase: string = DEFAULT_API_BASE) {
  return api.get<Chatbot>(path(apiBase, id));
}

export function getDefaultChatbot(apiBase: string = DEFAULT_API_BASE) {
  return api.get<Chatbot>(path(apiBase, "default"));
}

export function createChatbot(
  body: CreateChatbotBody,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<Chatbot>(apiBase, body);
}

export function updateChatbot(
  id: string,
  body: Partial<CreateChatbotBody> & {
    status?: ChatbotStatus;
    aiEnabled?: boolean;
    businessHoursOnly?: boolean;
    businessHoursSettings?: ChatbotBusinessHoursSettings;
    acknowledgementMessage?: string;
    liveChatEnabled?: boolean;
    welcomeVariants?: ChatbotWelcomeVariant[];
    progressiveProfilingEnabled?: boolean;
    progressiveProfilingAskAfterMessages?: number;
    progressiveProfilingPromptMessage?: string;
  },
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<Chatbot>(path(apiBase, id), body);
}

export function deleteChatbot(id: string, apiBase: string = DEFAULT_API_BASE) {
  return api.delete<void>(`${path(apiBase, id)}?confirm=true`);
}

export function duplicateChatbot(
  id: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<Chatbot>(path(apiBase, id, "duplicate"));
}

export function activateChatbot(
  id: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<Chatbot>(path(apiBase, id, "activate"));
}

export function disableChatbot(
  id: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<Chatbot>(path(apiBase, id, "disable"));
}

export function getChatbotEmbed(
  id: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<ChatbotEmbed>(path(apiBase, id, "embed"));
}

export function listChatbotRules(
  chatbotId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<ChatbotRule[]>(path(apiBase, chatbotId, "rules"));
}

export function createChatbotRule(
  chatbotId: string,
  body: {
    triggerType: ChatbotRuleTriggerType;
    triggerText: string;
    responseText: string;
    sortOrder?: number;
    isActive?: boolean;
  },
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<ChatbotRule>(path(apiBase, chatbotId, "rules"), body);
}

export function updateChatbotRule(
  chatbotId: string,
  ruleId: string,
  body: Partial<{
    triggerType: ChatbotRuleTriggerType;
    triggerText: string;
    responseText: string;
    sortOrder: number;
    isActive: boolean;
  }>,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<ChatbotRule>(
    path(apiBase, chatbotId, "rules", ruleId),
    body,
  );
}

export function deleteChatbotRule(
  chatbotId: string,
  ruleId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.delete<void>(
    `${path(apiBase, chatbotId, "rules", ruleId)}?confirm=true`,
  );
}

export function reorderChatbotRules(
  chatbotId: string,
  ruleIds: string[],
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<ChatbotRule[]>(path(apiBase, chatbotId, "rules", "reorder"), {
    ruleIds,
  });
}

export function previewChatbotRule(
  chatbotId: string,
  text: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<{ type: "reply" | "handoff" | null; text: string | null }>(
    path(apiBase, chatbotId, "rules", "preview"),
    { text },
  );
}

export function exportChatbotRules(
  chatbotId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<
    Array<{
      triggerType: ChatbotRuleTriggerType;
      triggerText: string;
      responseText: string;
      sortOrder: number;
      isActive: boolean;
    }>
  >(path(apiBase, chatbotId, "rules", "export"));
}

export function importChatbotRules(
  chatbotId: string,
  rules: Array<{
    triggerType: ChatbotRuleTriggerType;
    triggerText: string;
    responseText: string;
    sortOrder?: number;
    isActive?: boolean;
  }>,
  replace = true,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<ChatbotRule[]>(path(apiBase, chatbotId, "rules", "import"), {
    rules,
    replace,
  });
}

export function chatbotStatusLabel(status: ChatbotStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "ACTIVE":
      return "Active";
    case "DISABLED":
      return "Disabled";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}

export function formatChatbotTableDate(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getChatbotPlacementLabel(bot: Chatbot): string {
  return (
    bot.placementLabel ??
    (bot.position === "BOTTOM_LEFT" ? "Bottom left" : "Bottom right")
  );
}

