"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SseClient } from "@/features/realtime/sse-client";
import { handleRealtimeEvent } from "@/features/realtime/event-handlers";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

export function useBusinessEvents(businessId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!businessId || !isFeatureEnabled("realtimeSse")) return;

    const client = new SseClient({
      businessId,
      maxRetries: 8,
      maxBackoffMs: 30_000,
      onEvent: (payload) => handleRealtimeEvent(queryClient, payload),
      onDisconnect: () => {
        void queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) && q.queryKey[0] === "conversations",
        });
      },
    });

    client.connect();
    return () => client.close();
  }, [businessId, queryClient]);
}
