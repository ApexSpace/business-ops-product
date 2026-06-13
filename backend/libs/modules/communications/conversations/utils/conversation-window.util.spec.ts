import {
  isWhatsAppSessionOpen,
  requiresWhatsAppTemplate,
  WHATSAPP_SESSION_WINDOW_MS,
} from './conversation-window.util';

describe('conversation-window.util', () => {
  const now = new Date('2026-06-13T12:00:00.000Z');

  it('treats missing inbound as closed session', () => {
    expect(isWhatsAppSessionOpen(null, now)).toBe(false);
    expect(requiresWhatsAppTemplate(null, now)).toBe(true);
  });

  it('opens session within 24 hours of last inbound', () => {
    const recent = new Date(now.getTime() - WHATSAPP_SESSION_WINDOW_MS + 60_000);
    expect(isWhatsAppSessionOpen(recent, now)).toBe(true);
    expect(requiresWhatsAppTemplate(recent, now)).toBe(false);
  });

  it('closes session after 24 hours', () => {
    const stale = new Date(now.getTime() - WHATSAPP_SESSION_WINDOW_MS);
    expect(isWhatsAppSessionOpen(stale, now)).toBe(false);
    expect(requiresWhatsAppTemplate(stale, now)).toBe(true);
  });
});
