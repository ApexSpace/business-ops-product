type WhatsAppChangeValue = {
  messages?: Array<{ id?: string }>;
  statuses?: Array<{ id?: string; status?: string }>;
};

type FeedChangeValue = {
  comment_id?: string;
  post_id?: string;
  item?: string;
};

type InstagramCommentChangeValue = {
  id?: string;
  media?: { id?: string };
};

/**
 * Stable idempotency key for inbound Meta webhook deduplication.
 * Prefers inbound message ids, then feed/IG comment ids — never status-only updates.
 */
export function extractMetaWebhookEventId(
  body: Record<string, unknown>,
): string | null {
  const entries = Array.isArray(body.entry) ? body.entry : [];
  const first = entries[0] as
    | {
        id?: string;
        messaging?: Array<{ message?: { mid?: string } }>;
        changes?: Array<{
          value?: WhatsAppChangeValue &
            FeedChangeValue &
            InstagramCommentChangeValue;
          field?: string;
        }>;
      }
    | undefined;

  if (!first) {
    return null;
  }

  const mid = first.messaging?.[0]?.message?.mid?.trim();
  if (mid) {
    return mid;
  }

  for (const change of first.changes ?? []) {
    const messageId = change.value?.messages?.[0]?.id?.trim();
    if (messageId) {
      return messageId;
    }

    const commentId = change.value?.comment_id?.trim();
    if (commentId) {
      return `comment:${commentId}`;
    }

    const igCommentId = change.value?.id?.trim();
    if (
      igCommentId &&
      (change.field === 'comments' || change.field === 'live_comments')
    ) {
      return `ig-comment:${igCommentId}`;
    }
  }

  return null;
}

/** True when the payload only carries delivery/read status (no inbound message body). */
export function isMetaStatusOnlyWebhook(
  body: Record<string, unknown>,
): boolean {
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const changes = (
      entry as { changes?: Array<{ value?: WhatsAppChangeValue }> }
    ).changes;
    for (const change of changes ?? []) {
      const value = change.value;
      if (value?.messages?.length) {
        return false;
      }
      if (value?.statuses?.length) {
        return true;
      }
    }
  }
  return false;
}

/** True when the Meta payload includes Page feed or Instagram comment changes. */
export function hasMetaSocialCommentChanges(
  body: Record<string, unknown>,
): boolean {
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const changes = (
      entry as { changes?: Array<{ field?: string }> }
    ).changes;
    for (const change of changes ?? []) {
      if (
        change.field === 'feed' ||
        change.field === 'comments' ||
        change.field === 'live_comments'
      ) {
        return true;
      }
    }
  }
  return false;
}
