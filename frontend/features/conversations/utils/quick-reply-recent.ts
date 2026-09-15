const RECENT_QUICK_REPLY_IDS_KEY = "conversations.quick-replies.recent";
const MAX_RECENT = 40;

export function getRecentQuickReplyIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_QUICK_REPLY_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function markQuickReplyUsed(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = [
      id,
      ...getRecentQuickReplyIds().filter((existing) => existing !== id),
    ].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_QUICK_REPLY_IDS_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export type QuickReplySortMode = "recent" | "alpha";

export function sortQuickReplies<T extends { id: string; title: string }>(
  items: T[],
  mode: QuickReplySortMode,
  recentIds: string[],
): T[] {
  if (mode === "alpha") {
    return [...items].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );
  }

  const rank = new Map(recentIds.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aRank = rank.get(a.id);
    const bRank = rank.get(b.id);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}
