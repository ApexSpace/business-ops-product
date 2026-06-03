import { apiClient } from "@/lib/api-client";

export type ConversationChannel =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "WHATSAPP"
  | "EMAIL"
  | "SMS"
  | "WEBCHAT"
  | "LINKEDIN";

export type ConversationStatus = "OPEN" | "PENDING" | "CLOSED" | "SPAM";

export type ConversationDirection = "INBOUND" | "OUTBOUND";

export type MessageStatus =
  | "RECEIVED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export type MessageSenderType = "CONTACT" | "USER" | "SYSTEM" | "AI_AGENT";

export interface ConversationContactSummary {
  id: string;
  label: string;
  avatarUrl: string | null;
}

export interface ConversationAssignee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  contactId: string | null;
  channel: ConversationChannel;
  providerKey: string;
  resourceId: string | null;
  externalConversationId: string;
  externalParticipantId: string;
  externalPageId: string | null;
  title: string | null;
  status: ConversationStatus;
  assignedToUserId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  contact?: ConversationContactSummary | null;
  assignedTo?: ConversationAssignee | null;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  channel: ConversationChannel;
  providerKey: string;
  direction: ConversationDirection;
  senderType: MessageSenderType;
  senderUserId: string | null;
  text: string | null;
  attachments: unknown[] | null;
  status: MessageStatus;
  errorMessage: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export interface ConversationsListResponse {
  items: Conversation[];
  meta: { total: number; page: number; limit: number };
}

export interface ConversationMessagesResponse {
  items: ConversationMessage[];
  meta: { total: number; page: number; limit: number };
}

export interface MessagingStatus {
  connected: boolean;
  defaultResourceSelected: boolean;
  webhookEndpointConfigured: boolean;
  requiredPermissionsPresent: boolean;
  readyForMessaging: boolean;
  warnings: string[];
}

export type ConversationListFilters = {
  page?: number;
  limit?: number;
  channel?: ConversationChannel;
  status?: ConversationStatus;
  assignedToMe?: boolean;
  search?: string;
  contactId?: string;
};

export function listConversations(filters: ConversationListFilters = {}) {
  const searchParams: Record<string, string | number | undefined> = {
    page: filters.page,
    limit: filters.limit,
    channel: filters.channel,
    status: filters.status,
    search: filters.search,
    contactId: filters.contactId,
    assignedToMe: filters.assignedToMe ? "true" : undefined,
  };
  return apiClient<ConversationsListResponse>("conversations", {
    searchParams,
  });
}

export function getConversation(id: string) {
  return apiClient<Conversation>(`conversations/${id}`);
}

export function listConversationMessages(
  id: string,
  page = 1,
  limit = 50,
) {
  return apiClient<ConversationMessagesResponse>(`conversations/${id}/messages`, {
    searchParams: { page, limit },
  });
}

export function sendConversationMessage(id: string, text: string) {
  return apiClient<ConversationMessage>(`conversations/${id}/messages`, {
    method: "POST",
    body: { text },
  });
}

export function listConversationsByContact(contactId: string) {
  return apiClient<Conversation[]>(`conversations/by-contact/${contactId}`);
}

export function markConversationRead(id: string) {
  return apiClient<Conversation>(`conversations/${id}/mark-read`, {
    method: "POST",
  });
}

export function closeConversation(id: string) {
  return apiClient<Conversation>(`conversations/${id}/close`, {
    method: "POST",
  });
}

export function reopenConversation(id: string) {
  return apiClient<Conversation>(`conversations/${id}/reopen`, {
    method: "POST",
  });
}

export function getMessagingStatus(providerKey: string) {
  return apiClient<MessagingStatus>(
    `integrations/business/${providerKey}/messaging-status`,
  );
}

export function channelLabel(channel: ConversationChannel): string {
  switch (channel) {
    case "FACEBOOK":
      return "Facebook";
    case "INSTAGRAM":
      return "Instagram";
    case "WHATSAPP":
      return "WhatsApp";
    case "EMAIL":
      return "Email";
    case "SMS":
      return "SMS";
    case "WEBCHAT":
      return "Web chat";
    case "LINKEDIN":
      return "LinkedIn";
    default:
      return channel;
  }
}
