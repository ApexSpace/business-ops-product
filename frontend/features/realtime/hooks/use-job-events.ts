"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { handleRealtimeEvent } from "@/features/realtime/event-handlers";
import { isAnyRealtimeTransportEnabled } from "@/features/realtime/realtime-polling";
import { RealtimeClient } from "@/features/realtime/transport/realtime-client";
import { fetchWsAccessToken } from "@/lib/realtime/fetch-ws-access-token";
import { queryKeys } from "@/lib/query/keys";

export function useJobEvents(businessId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!businessId || !isAnyRealtimeTransportEnabled()) return;

    const client = new RealtimeClient({
      businessId,
      getAccessToken: fetchWsAccessToken,
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
