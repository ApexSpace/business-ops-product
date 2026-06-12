"use client";

import { useQuery } from "@tanstack/react-query";
import { useBusinessEvents } from "@/features/realtime/hooks/use-business-events";
import { RealtimeModeProvider } from "@/features/realtime/realtime-mode-context";
import { getCurrentBusiness } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";

function BusinessRealtimeConnection({
  businessId,
  children,
}: {
  businessId: string | undefined;
  children: React.ReactNode;
}) {
  useBusinessEvents(businessId);
  return <>{children}</>;
}

export function BusinessRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: getCurrentBusiness,
  });

  return (
    <RealtimeModeProvider>
      <BusinessRealtimeConnection businessId={business?.id}>
        {children}
      </BusinessRealtimeConnection>
    </RealtimeModeProvider>
  );
}
