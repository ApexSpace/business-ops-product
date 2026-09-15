import type { ChatbotWelcomeVariant } from '../types/chatbot-settings.types';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesPattern(source: string, pattern: string): boolean {
  const haystack = normalize(source);
  const needle = normalize(pattern);
  if (!needle) return false;
  if (needle.includes('*')) {
    const escaped = needle
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i').test(haystack);
  }
  return haystack.includes(needle);
}

export function resolveWelcomeMessage(
  defaultMessage: string,
  variants: ChatbotWelcomeVariant[] | undefined,
  context: { pageUrl?: string | null; referrer?: string | null },
): string {
  if (!variants?.length) {
    return defaultMessage;
  }

  for (const variant of variants) {
    const pattern = variant.pattern?.trim();
    const message = variant.message?.trim();
    if (!pattern || !message) continue;

    if (variant.matchType === 'page_url' && context.pageUrl) {
      if (matchesPattern(context.pageUrl, pattern)) {
        return message;
      }
    }

    if (variant.matchType === 'referrer' && context.referrer) {
      if (matchesPattern(context.referrer, pattern)) {
        return message;
      }
    }
  }

  return defaultMessage;
}
