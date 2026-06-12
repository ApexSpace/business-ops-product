"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { handleRealtimeEvent } from "@/features/realtime/event-handlers";
import { isAnyRealtimeTransportEnabled } from "@/features/realtime/realtime-polling";
import {
  useRealtimeConnectionStateSetter,
  useRealtimeModeSetter,
} from "@/features/realtime/realtime-mode-context";
import { RealtimeClient } from "@/features/realtime/transport/realtime-client";
import { fetchWsAccessToken } from "@/lib/realtime/fetch-ws-access-token";
import { queryKeys } from "@/lib/query/keys";

export function useBusinessEvents(businessId: string | undefined) {
  const queryClient = useQueryClient();
  const setRealtimeMode = useRealtimeModeSetter();
  const setConnectionState = useRealtimeConnectionStateSetter();

  useEffect(() => {
    if (!businessId || !isAnyRealtimeTransportEnabled()) {
      setRealtimeMode("polling-only");
      setConnectionState("degraded");
      return;
    }

    setConnectionState("connecting");

    const client = new RealtimeClient({
      businessId,
      getAccessToken: fetchWsAccessToken,
      onEvent: (payload) => handleRealtimeEvent(queryClient, payload),
      onModeChange: (mode) => {
        setRealtimeMode(mode);
        if (mode === "websocket" || mode === "sse") {
          setConnectionState("live");
        }
      },
      onDisconnect: () => {
        void queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) && q.queryKey[0] === "conversations",
        });
      },
      onUnavailable: () => {
        setRealtimeMode("polling-only");
        setConnectionState("degraded");
      },
      maxRetries: 8,
      maxBackoffMs: 30_000,
    });

    client.connect();
    return () => client.close();
  }, [businessId, queryClient, setConnectionState, setRealtimeMode]);
}
