export interface ChatbotSessionMetadata {
  botPaused?: boolean;
  handoffAt?: string;
}

export function parseChatbotSessionMetadata(
  raw: unknown,
): ChatbotSessionMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const value = raw as Record<string, unknown>;
  return {
    botPaused: value.botPaused === true,
    handoffAt:
      typeof value.handoffAt === 'string' ? value.handoffAt : undefined,
  };
}

export function isChatbotSessionPaused(raw: unknown): boolean {
  return parseChatbotSessionMetadata(raw).botPaused === true;
}
