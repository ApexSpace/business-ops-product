"use client";

import { useMemo, useState } from "react";
import type { ConversationStatus } from "@/features/conversations/api/conversations.api";

export type InboxStatusFilter =
  | "ALL"
  | Extract<ConversationStatus, "OPEN" | "CLOSED" | "SPAM">;

export function useConversationsInboxFilters() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InboxStatusFilter>("ALL");

  const listFilters = useMemo(() => {
    return {
      page: 1,
      limit: 50,
      search: search.trim() || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    };
  }, [search, statusFilter]);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    listFilters,
  };
}
