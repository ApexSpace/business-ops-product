"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversationsOpsContext } from "@/features/conversations/api/conversations.api";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import { useBusinessEvents } from "@/features/realtime/hooks/use-business-events";
import { RealtimeModeProvider } from "@/features/realtime/realtime-mode-context";
import { queryKeys } from "@/lib/query/keys";

function PlatformConversationsRealtimeConnection({
  children,
}: {
  children: React.ReactNode;
}) {
  const { apiBase } = useConversationsHost();
  const { data } = useQuery({
    queryKey: queryKeys.conversations.opsContext(),
    queryFn: () => getConversationsOpsContext(apiBase),
    staleTime: 5 * 60_000,
  });

  useBusinessEvents(data?.businessId, {
    conversationsApiBase: apiBase,
  });

  return <>{children}</>;
}

/** Realtime for the INTERNAL ops inbox — scoped via platform ops-context. */
export function PlatformConversationsRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeModeProvider>
      <PlatformConversationsRealtimeConnection>
        {children}
      </PlatformConversationsRealtimeConnection>
    </RealtimeModeProvider>
  );
}
