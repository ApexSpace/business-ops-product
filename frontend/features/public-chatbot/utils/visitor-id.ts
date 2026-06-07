const STORAGE_PREFIX = "ba_chat_visitor_";

export function getOrCreateVisitorId(publicKey: string): string {
  if (typeof window === "undefined") return "";
  const key = `${STORAGE_PREFIX}${publicKey}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, id);
  return id;
}

const SESSION_PREFIX = "ba_chat_session_";

export function getStoredSessionId(publicKey: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${SESSION_PREFIX}${publicKey}`);
}

export function storeSessionId(publicKey: string, sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${SESSION_PREFIX}${publicKey}`, sessionId);
}
