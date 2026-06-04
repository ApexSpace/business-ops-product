"use client";

import { useQuery } from "@tanstack/react-query";
import { useBusinessEvents } from "@/features/realtime/hooks/use-business-events";
import { getCurrentBusiness } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";
import type { Business } from "@/lib/types/shared";

export function BusinessRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: getCurrentBusiness,
  });

  useBusinessEvents(business?.id);

  return <>{children}</>;
}
