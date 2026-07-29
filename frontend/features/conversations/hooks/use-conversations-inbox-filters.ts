"use client";

import { useMemo, useState } from "react";
import type { ConversationStatus } from "@/features/conversations/api/conversations.api";

export type InboxStatusFilter = Extract<
  ConversationStatus,
  "OPEN" | "CLOSED" | "SPAM"
>;

export function useConversationsInboxFilters() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InboxStatusFilter>("OPEN");

  const listFilters = useMemo(() => {
    return {
      page: 1,
      limit: 50,
      search: search.trim() || undefined,
      status: statusFilter,
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
