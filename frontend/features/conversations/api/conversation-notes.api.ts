import { api } from "@/lib/api/client";

const DEFAULT_API_BASE = "conversations";

function path(apiBase: string, ...segments: string[]) {
  return [apiBase, ...segments].filter(Boolean).join("/");
}

export interface ConversationNote {
  id: string;
  conversationId: string;
  body: string;
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function listConversationNotes(
  conversationId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<ConversationNote[]>(path(apiBase, conversationId, "notes"));
}

export function createConversationNote(
  conversationId: string,
  body: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<ConversationNote>(path(apiBase, conversationId, "notes"), {
    body,
  });
}

export function endChatbotSessionForConversation(
  conversationId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<{ sessionId: string | null; status: string | null }>(
    path(apiBase, conversationId, "end-chatbot-session"),
    {},
  );
}

export function convertChatbotSessionForConversation(
  conversationId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<{ sessionId: string | null; status: string | null }>(
    path(apiBase, conversationId, "convert-chatbot-session"),
    {},
  );
}

export function pauseChatbotForConversation(
  conversationId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<{ botPaused: boolean }>(
    path(apiBase, conversationId, "pause-chatbot"),
    {},
  );
}

export function resumeChatbotForConversation(
  conversationId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<{ botPaused: boolean }>(
    path(apiBase, conversationId, "resume-chatbot"),
    {},
  );
}
