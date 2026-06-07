import { getErrorMessage, parseEnvelope } from "@/lib/api/envelope";
import { ApiClientError } from "@/lib/api/errors";

export interface PublicChatbotConfig {
  publicKey: string;
  widgetTitle: string;
  welcomeMessage: string;
  offlineMessage: string;
  avatarUrl: string | null;
  primaryColor: string;
  position: "BOTTOM_RIGHT" | "BOTTOM_LEFT";
  collectContactInfo: boolean;
  requireName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  showNotesField: boolean;
  allowAnonymous: boolean;
  showBranding: boolean;
  acknowledgementMessage?: string;
  businessName: string;
}

export interface PublicChatbotSession {
  sessionId: string;
  conversationId: string;
}

export interface PublicChatbotMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: string;
  text: string | null;
  createdAt: string;
}

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`/api/backend/${normalized}`, window.location.origin);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiClientError(
      getErrorMessage(body, "Request failed"),
      res.status,
      body?.error ?? body,
    );
  }

  return parseEnvelope<T>(body).data;
}

export function getPublicChatbotConfig(publicKey: string) {
  return publicFetch<PublicChatbotConfig>(
    `public/chatbots/${encodeURIComponent(publicKey)}/config`,
  );
}

export function startPublicChatbotSession(
  publicKey: string,
  body: {
    visitorId: string;
    visitorName?: string;
    visitorEmail?: string;
    visitorPhone?: string;
    initialMessage?: string;
    pageUrl?: string;
    referrer?: string;
    anonymous?: boolean;
  },
) {
  return publicFetch<PublicChatbotSession>(
    `public/chatbots/${encodeURIComponent(publicKey)}/sessions`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function sendPublicChatbotMessage(sessionId: string, text: string) {
  return publicFetch<PublicChatbotMessage>(
    `public/chatbots/sessions/${encodeURIComponent(sessionId)}/messages`,
    { method: "POST", body: JSON.stringify({ text }) },
  );
}

export function listPublicChatbotMessages(sessionId: string, since?: string) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  return publicFetch<PublicChatbotMessage[]>(
    `public/chatbots/sessions/${encodeURIComponent(sessionId)}/messages${qs}`,
  );
}
