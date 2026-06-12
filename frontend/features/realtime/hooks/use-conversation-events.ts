"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { handleRealtimeEvent } from "@/features/realtime/event-handlers";
import { isAnyRealtimeTransportEnabled } from "@/features/realtime/realtime-polling";
import { RealtimeClient } from "@/features/realtime/transport/realtime-client";
import { fetchWsAccessToken } from "@/lib/realtime/fetch-ws-access-token";
import { queryKeys } from "@/lib/query/keys";

/**
 * Prefer {@link useBusinessEvents} at layout level (single connection per business).
 * Use this only when no parent layout already subscribes to business events.
 */
export function useConversationEvents(
  businessId: string | undefined,
  activeConversationId: string | null,
  options?: { subscribe?: boolean },
) {
  const queryClient = useQueryClient();
  const subscribe = options?.subscribe ?? false;

  useEffect(() => {
    if (!subscribe || !businessId || !isAnyRealtimeTransportEnabled()) return;

    const client = new RealtimeClient({
      businessId,
      getAccessToken: fetchWsAccessToken,
      maxRetries: 8,
      maxBackoffMs: 30_000,
      onEvent: (payload) => {
        handleRealtimeEvent(queryClient, payload);
        if (activeConversationId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.conversations.messages(
              activeConversationId,
              0,
            ),
          });
        }
      },
    });

    client.connect();
    return () => client.close();
  }, [subscribe, businessId, activeConversationId, queryClient]);
}
