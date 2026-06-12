"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { listContactMessages } from "@/features/conversations/api/conversations.api";
import { useRealtimeMode } from "@/features/realtime/realtime-mode-context";
import {
  getRealtimePollIntervalMs,
  isAnyRealtimeTransportEnabled,
} from "@/features/realtime/realtime-polling";
import { queryKeys } from "@/lib/query/keys";

const MESSAGE_PAGE_SIZE = 50;

export function useContactMessages(contactId: string | null) {
  const realtimeMode = useRealtimeMode();
  const pollInterval = isAnyRealtimeTransportEnabled()
    ? getRealtimePollIntervalMs(realtimeMode)
    : 5_000;

  return useInfiniteQuery({
    queryKey: queryKeys.conversations.contactMessages(contactId ?? "", 0),
    queryFn: ({ pageParam }) => {
      if (typeof pageParam === "string" && pageParam) {
        return listContactMessages(contactId!, {
          cursor: pageParam,
          direction: "before",
          limit: MESSAGE_PAGE_SIZE,
        });
      }
      return listContactMessages(contactId!, {
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
    enabled: Boolean(contactId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: pollInterval,
  });
}
