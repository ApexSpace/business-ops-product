import { CONVERSATION_REPLY_TO_PREFIX } from '../constants/email-platform.constants';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMPACT_UUID_PAIR_RE = /^[0-9a-f]{64}$/i;

function uuidToCompact(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}

function compactToUuid(compact: string): string {
  const normalized = compact.toLowerCase();
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

/**
 * Builds a Reply-To address for conversation routing.
 * Local part is exactly 64 hex chars (two UUIDs without hyphens) so Resend/RFC accept it.
 */
export function buildConversationReplyToAddress(
  conversationId: string,
  tenantId: string,
  inboundDomain: string,
): string {
  const conversationCompact = uuidToCompact(conversationId);
  const tenantCompact = uuidToCompact(tenantId);
  if (
    !UUID_RE.test(conversationId) ||
    !UUID_RE.test(tenantId) ||
    conversationCompact.length !== 32 ||
    tenantCompact.length !== 32
  ) {
    throw new Error('conversationId and tenantId must be valid UUIDs');
  }

  return `${conversationCompact}${tenantCompact}@${inboundDomain}`;
}

function parseLegacyConversationReplyToAddress(
  local: string,
): { conversationId: string; tenantId: string } | null {
  if (!local.startsWith(`${CONVERSATION_REPLY_TO_PREFIX}_`)) {
    return null;
  }

  const body = local.slice(CONVERSATION_REPLY_TO_PREFIX.length + 1);
  const separator = body.indexOf('_');
  if (separator <= 0 || separator >= body.length - 1) {
    return null;
  }

  const conversationId = body.slice(0, separator);
  const tenantId = body.slice(separator + 1);
  if (!UUID_RE.test(conversationId) || !UUID_RE.test(tenantId)) {
    return null;
  }

  return { conversationId, tenantId };
}

/** Ensures routing addresses include the inbound domain when only the local part is present. */
export function normalizeRoutableEmailAddress(
  address: string,
  inboundDomain: string,
): string {
  const trimmed = address.trim().toLowerCase();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.includes('@')) {
    return trimmed;
  }
  if (COMPACT_UUID_PAIR_RE.test(trimmed)) {
    return `${trimmed}@${inboundDomain}`;
  }
  return trimmed;
}

export function parseConversationReplyToAddress(
  address: string,
): { conversationId: string; tenantId: string } | null {
  const trimmed = address.trim().toLowerCase();

  if (COMPACT_UUID_PAIR_RE.test(trimmed)) {
    return {
      conversationId: compactToUuid(trimmed.slice(0, 32)),
      tenantId: compactToUuid(trimmed.slice(32)),
    };
  }

  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0) {
    return null;
  }

  const local = trimmed.slice(0, atIndex);

  if (COMPACT_UUID_PAIR_RE.test(local)) {
    const conversationId = compactToUuid(local.slice(0, 32));
    const tenantId = compactToUuid(local.slice(32));
    return { conversationId, tenantId };
  }

  return parseLegacyConversationReplyToAddress(local);
}
