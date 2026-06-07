import { randomBytes } from 'crypto';

export function generateChatbotPublicKey(): string {
  return randomBytes(18).toString('base64url');
}

export function buildChatbotWidgetPath(publicKey: string): string {
  return `/widgets/chatbot/${encodeURIComponent(publicKey)}`;
}

export function buildChatbotScriptPath(): string {
  return '/widgets/chatbot.js';
}

export function buildChatbotWidgetUrl(
  backendPublicUrl: string,
  publicKey: string,
): string {
  const base = backendPublicUrl.replace(/\/$/, '');
  return `${base}${buildChatbotWidgetPath(publicKey)}`;
}

export function buildChatbotScriptUrl(backendPublicUrl: string): string {
  const base = backendPublicUrl.replace(/\/$/, '');
  return `${base}${buildChatbotScriptPath()}`;
}

export const WEBCHAT_PROVIDER_KEY = 'webchat';

export const CHATBOT_MAX_MESSAGE_LENGTH = 4000;
