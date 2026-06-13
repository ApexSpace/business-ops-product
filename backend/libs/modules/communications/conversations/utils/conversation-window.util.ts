export const WHATSAPP_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWhatsAppSessionOpen(
  lastInboundAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastInboundAt) {
    return false;
  }

  const elapsed = now.getTime() - lastInboundAt.getTime();
  return elapsed >= 0 && elapsed < WHATSAPP_SESSION_WINDOW_MS;
}

export function requiresWhatsAppTemplate(
  lastInboundAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return !isWhatsAppSessionOpen(lastInboundAt, now);
}
