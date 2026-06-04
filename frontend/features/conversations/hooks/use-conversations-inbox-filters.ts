"use client";

import { useMemo, useState } from "react";

export type ConversationInboxFilterKey =
  | "all"
  | "facebook"
  | "instagram"
  | "open"
  | "unread"
  | "assigned";

export function useConversationsInboxFilters() {
  const [filter, setFilter] = useState<ConversationInboxFilterKey>("all");
  const [search, setSearch] = useState("");

  const listFilters = useMemo(() => {
    const base: Record<string, string | number | undefined> = {
      page: 1,
      limit: 50,
      search: search.trim() || undefined,
    };
    if (filter === "facebook") base.channel = "FACEBOOK";
    if (filter === "instagram") base.channel = "INSTAGRAM";
    if (filter === "open") base.status = "OPEN";
    if (filter === "assigned") base.assignedToMe = "true";
    return base;
  }, [filter, search]);

  return { filter, setFilter, search, setSearch, listFilters };
}
