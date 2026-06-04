const marks = new Map<string, number>();

export function markMessageSendStart(conversationId: string): void {
  marks.set(conversationId, performance.now());
}

export function markMessageSendPending(conversationId: string): void {
  const start = marks.get(conversationId);
  if (start === undefined) return;
  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[message-latency] ${conversationId} PENDING ${(performance.now() - start).toFixed(0)}ms`,
    );
  }
}

export function markMessageSendComplete(conversationId: string): void {
  const start = marks.get(conversationId);
  if (start === undefined) return;
  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[message-latency] ${conversationId} SENT ${(performance.now() - start).toFixed(0)}ms`,
    );
  }
  marks.delete(conversationId);
}
