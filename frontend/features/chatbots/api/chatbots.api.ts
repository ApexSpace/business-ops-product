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

export function listChatbots(params?: { page?: number; limit?: number }) {
  return api.getPaginated<Chatbot>("chatbots", { searchParams: params });
}

export function getChatbot(id: string) {
  return api.get<Chatbot>(`chatbots/${id}`);
}

export function createChatbot(body: CreateChatbotBody) {
  return api.post<Chatbot>("chatbots", body);
}

export function updateChatbot(id: string, body: Partial<CreateChatbotBody> & {
  status?: ChatbotStatus;
  aiEnabled?: boolean;
  businessHoursOnly?: boolean;
  businessHoursSettings?: ChatbotBusinessHoursSettings;
  welcomeVariants?: ChatbotWelcomeVariant[];
  progressiveProfilingEnabled?: boolean;
  progressiveProfilingAskAfterMessages?: number;
  progressiveProfilingPromptMessage?: string;
}) {
  return api.patch<Chatbot>(`chatbots/${id}`, body);
}

export function deleteChatbot(id: string) {
  return api.delete<void>(`chatbots/${id}?confirm=true`);
}

export function duplicateChatbot(id: string) {
  return api.post<Chatbot>(`chatbots/${id}/duplicate`);
}

export function activateChatbot(id: string) {
  return api.post<Chatbot>(`chatbots/${id}/activate`);
}

export function disableChatbot(id: string) {
  return api.post<Chatbot>(`chatbots/${id}/disable`);
}

export function getChatbotEmbed(id: string) {
  return api.get<ChatbotEmbed>(`chatbots/${id}/embed`);
}

export function listChatbotRules(chatbotId: string) {
  return api.get<ChatbotRule[]>(`chatbots/${chatbotId}/rules`);
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
) {
  return api.post<ChatbotRule>(`chatbots/${chatbotId}/rules`, body);
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
) {
  return api.patch<ChatbotRule>(`chatbots/${chatbotId}/rules/${ruleId}`, body);
}

export function deleteChatbotRule(chatbotId: string, ruleId: string) {
  return api.delete<void>(
    `chatbots/${chatbotId}/rules/${ruleId}?confirm=true`,
  );
}

export function reorderChatbotRules(chatbotId: string, ruleIds: string[]) {
  return api.patch<ChatbotRule[]>(`chatbots/${chatbotId}/rules/reorder`, {
    ruleIds,
  });
}

export function previewChatbotRule(chatbotId: string, text: string) {
  return api.post<{ type: "reply" | "handoff" | null; text: string | null }>(
    `chatbots/${chatbotId}/rules/preview`,
    { text },
  );
}

export function exportChatbotRules(chatbotId: string) {
  return api.get<
    Array<{
      triggerType: ChatbotRuleTriggerType;
      triggerText: string;
      responseText: string;
      sortOrder: number;
      isActive: boolean;
    }>
  >(`chatbots/${chatbotId}/rules/export`);
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
) {
  return api.post<ChatbotRule[]>(`chatbots/${chatbotId}/rules/import`, {
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
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
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
