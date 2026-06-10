"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listPlatformCapabilities } from "@/features/platform/api/capabilities.api";
import type { PublicPricingCapability } from "@/features/platform/types/plan-group";
import { queryKeys } from "@/lib/query/keys";

import { resolveTierCapabilityId } from "./plan-tier-form.utils";

type CapabilitySource = {
  id?: string;
  capabilityId?: string;
  key?: string;
  name?: string;
};

const ACTIVE_CAPABILITY_FILTERS = {
  status: "ACTIVE",
  limit: 100,
  page: 1,
} as const;

export function usePreviewCapabilities(
  assigned: CapabilitySource[],
): PublicPricingCapability[] {
  const { data: capabilitiesData } = useQuery({
    queryKey: queryKeys.platform.capabilities.list(ACTIVE_CAPABILITY_FILTERS),
    queryFn: () => listPlatformCapabilities(ACTIVE_CAPABILITY_FILTERS),
  });

  return useMemo(
    () =>
      assigned.map((cap) => {
        const id = resolveTierCapabilityId(cap);
        const match = capabilitiesData?.items.find((item) => item.id === id);
        return {
          key: cap.key?.trim() || match?.key || id || "capability",
          name: cap.name?.trim() || match?.name || "Capability",
        };
      }),
    [assigned, capabilitiesData],
  );
}
