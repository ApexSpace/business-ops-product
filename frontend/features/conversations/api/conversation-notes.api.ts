import { api } from "@/lib/api/client";

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

export function listConversationNotes(conversationId: string) {
  return api.get<ConversationNote[]>(`conversations/${conversationId}/notes`);
}

export function createConversationNote(conversationId: string, body: string) {
  return api.post<ConversationNote>(`conversations/${conversationId}/notes`, {
    body,
  });
}

export function endChatbotSessionForConversation(conversationId: string) {
  return api.post<{ sessionId: string | null; status: string | null }>(
    `conversations/${conversationId}/end-chatbot-session`,
    {},
  );
}

export function convertChatbotSessionForConversation(conversationId: string) {
  return api.post<{ sessionId: string | null; status: string | null }>(
    `conversations/${conversationId}/convert-chatbot-session`,
    {},
  );
}

export function pauseChatbotForConversation(conversationId: string) {
  return api.post<{ botPaused: boolean }>(
    `conversations/${conversationId}/pause-chatbot`,
    {},
  );
}

export function resumeChatbotForConversation(conversationId: string) {
  return api.post<{ botPaused: boolean }>(
    `conversations/${conversationId}/resume-chatbot`,
    {},
  );
}
