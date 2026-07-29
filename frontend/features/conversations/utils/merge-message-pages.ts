import type { ConversationMessage } from "@/features/conversations/api/conversations.api";

type MessagePage = { items: ConversationMessage[] };

/**
 * Merges infinite-query pages loaded with `latest=true` + `direction=before`.
 * Page 0 is the newest chunk; later pages are older and must come first.
 */
export function mergeConversationMessagePages(
  pages: MessagePage[] | undefined,
): ConversationMessage[] {
  if (!pages?.length) return [];

  const merged = pages
    .slice()
    .reverse()
    .flatMap((page) => page.items);

  const seen = new Set<string>();
  return merged.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
}
