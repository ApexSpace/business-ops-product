"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { listConversationMessages } from "@/features/conversations/api/conversations.api";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { queryKeys } from "@/lib/query/keys";

const MESSAGE_PAGE_SIZE = 50;

export function useConversationMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(conversationId ?? "", 0),
    queryFn: ({ pageParam }) => {
      if (typeof pageParam === "string" && pageParam) {
        return listConversationMessages(conversationId!, {
          cursor: pageParam,
          direction: "before",
          limit: MESSAGE_PAGE_SIZE,
        });
      }
      return listConversationMessages(conversationId!, {
        latest: true,
        limit: MESSAGE_PAGE_SIZE,
      });
    },
    initialPageParam: "" as string,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.hasMore && lastPage.meta.nextCursor) {
        return lastPage.meta.nextCursor;
      }
      return undefined;
    },
    enabled: Boolean(conversationId),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: isFeatureEnabled("realtimeSse") ? 12_000 : 5_000,
  });
}
