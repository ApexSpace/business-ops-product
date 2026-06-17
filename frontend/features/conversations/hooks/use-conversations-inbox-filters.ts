"use client";

import { useMemo, useState } from "react";

export function useConversationsInboxFilters() {
  const [search, setSearch] = useState("");

  const listFilters = useMemo(() => {
    return {
      page: 1,
      limit: 50,
      search: search.trim() || undefined,
    };
  }, [search]);

  return { search, setSearch, listFilters };
}
