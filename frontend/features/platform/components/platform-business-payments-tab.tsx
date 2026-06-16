"use client";

import { useQuery } from "@tanstack/react-query";
import { PlatformBusinessInvoicesSection } from "@/features/platform/components/platform-business-invoices-section";
import { getPlatformBusinessAccess } from "@/features/platform/api/business-access.api";
import { queryKeys } from "@/lib/query/keys";

export function PlatformBusinessPaymentsTab({
  businessId,
}: {
  businessId: string;
}) {
  const { data: access } = useQuery({
    queryKey: queryKeys.platform.businesses.access(businessId),
    queryFn: () => getPlatformBusinessAccess(businessId),
  });

  return (
    <PlatformBusinessInvoicesSection businessId={businessId} access={access} />
  );
}
