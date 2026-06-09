import { api } from "@/lib/api/client";

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

export async function listConversations(filters: ConversationListFilters = {}) {
  const { items, meta } = await api.getPaginated<Conversation>("conversations", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      channel: filters.channel,
      status: filters.status,
      search: filters.search,
      contactId: filters.contactId,
      assignedToMe: filters.assignedToMe ? "true" : undefined,
    },
  });
  return { items, meta };
}

export function getConversation(id: string) {
  return api.get<Conversation>(`conversations/${id}`);
}

export async function listConversationMessages(
  id: string,
  options: {
    page?: number;
    limit?: number;
    cursor?: string;
    direction?: "before" | "after";
    latest?: boolean;
  } = {},
) {
  const { page = 1, limit = 50, cursor, direction, latest } = options;
  const searchParams: Record<string, string | number | boolean | undefined> = {
    limit,
  };

  if (cursor || latest) {
    if (cursor) searchParams.cursor = cursor;
    if (direction) searchParams.direction = direction;
    if (latest) searchParams.latest = true;
  } else {
    searchParams.page = page;
  }

  if (cursor || latest) {
    const { data, meta } = await api.getEnvelope<ConversationMessage[]>(
      `conversations/${id}/messages`,
      { searchParams },
    );
    const items = Array.isArray(data) ? data : [];
    return {
      items,
      meta: {
        limit,
        nextCursor:
          typeof meta.nextCursor === "string" || meta.nextCursor === null
            ? meta.nextCursor
            : undefined,
        prevCursor:
          typeof meta.prevCursor === "string" || meta.prevCursor === null
            ? meta.prevCursor
            : undefined,
        hasMore: meta.hasMore === true,
      },
    };
  }

  const { items, meta } = await api.getPaginated<ConversationMessage>(
    `conversations/${id}/messages`,
    { searchParams },
  );

  return {
    items,
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
    },
  };
}

export type SendMessageResult = {
  message: ConversationMessage;
  jobId?: string;
  pollUrl?: string;
};

export type SendConversationMessageInput = {
  text?: string;
  attachments?: Array<{ type: string; url: string }>;
};

export async function sendConversationMessage(
  id: string,
  input: string | SendConversationMessageInput,
): Promise<SendMessageResult> {
  const body =
    typeof input === "string"
      ? { text: input }
      : {
          text: input.text,
          attachments: input.attachments,
        };

  const { data, meta } = await api.postWithMeta<ConversationMessage>(
    `conversations/${id}/messages`,
    body,
  );

  return {
    message: data,
    jobId: typeof meta.jobId === "string" ? meta.jobId : undefined,
    pollUrl: typeof meta.pollUrl === "string" ? meta.pollUrl : undefined,
  };
}

export function listConversationsByContact(contactId: string) {
  return api.get<Conversation[]>(`conversations/by-contact/${contactId}`);
}

export function markConversationRead(id: string) {
  return api.post<Conversation>(`conversations/${id}/mark-read`);
}

export function closeConversation(id: string) {
  return api.post<Conversation>(`conversations/${id}/close`);
}

export function reopenConversation(id: string) {
  return api.post<Conversation>(`conversations/${id}/reopen`);
}

export function assignConversation(
  id: string,
  assignedToUserId: string | null,
) {
  return api.post<Conversation>(`conversations/${id}/assign`, {
    assignedToUserId,
  });
}

export function getMessagingStatus(providerKey: string) {
  return api.get<MessagingStatus>(
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
