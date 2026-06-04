"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SseClient } from "@/features/realtime/sse-client";
import { handleRealtimeEvent } from "@/features/realtime/event-handlers";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { queryKeys } from "@/lib/query/keys";

export function useJobEvents(businessId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!businessId || !isFeatureEnabled("realtimeSse")) return;

    const client = new SseClient({
      businessId,
      maxRetries: 8,
      maxBackoffMs: 30_000,
      onEvent: (payload) => {
        if (
          payload.event === "job.completed" ||
          payload.event === "integration.status_changed"
        ) {
          handleRealtimeEvent(queryClient, payload);
          void queryClient.invalidateQueries({
            queryKey: queryKeys.integrations.businessList(),
          });
        }
      },
    });

    client.connect();
    return () => client.close();
  }, [businessId, queryClient]);
}
