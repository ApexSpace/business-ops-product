"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BUSINESS_ACCESS_BLOCKED_EVENT,
  FEATURE_UNAVAILABLE_EVENT,
} from "@/lib/api/error-classifier";
import { supportConfig } from "@/lib/config/support";
import { useAuth } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentBusinessAccess } from "./business-access.api";
import type { BusinessTenantAccess } from "./types";

export type BusinessAccessContextValue = {
  access: BusinessTenantAccess | undefined;
  isLoading: boolean;
  isError: boolean;
  canAccessWorkspace: boolean;
  isBlocked: boolean;
  blockedReasonCode?: string;
  capabilityKeys: Set<string>;
  supportContact: typeof supportConfig;
  setBlockedFromError: (code?: string) => void;
  clearBlockedState: () => void;
  refetch: () => void;
};

export const BusinessAccessCtx = createContext<BusinessAccessContextValue | null>(
  null,
);

export function BusinessAccessProvider({ children }: { children: ReactNode }) {
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const businessId =
    jwt?.context === "business" ? jwt.businessId : undefined;

  const [blockedByBusiness, setBlockedByBusiness] = useState<
    Record<string, { code?: string }>
  >({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.business.access(),
    queryFn: getCurrentBusinessAccess,
    enabled: Boolean(businessId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const setBlockedFromError = useCallback(
    (code?: string) => {
      if (!businessId) return;
      setBlockedByBusiness((prev) => ({
        ...prev,
        [businessId]: { code },
      }));
    },
    [businessId],
  );

  const clearBlockedState = useCallback(() => {
    if (!businessId) return;
    setBlockedByBusiness((prev) => {
      const next = { ...prev };
      delete next[businessId];
      return next;
    });
  }, [businessId]);

  useEffect(() => {
    const onBlocked = (event: Event) => {
      const detail = (event as CustomEvent<{ code?: string; message: string }>)
        .detail;
      setBlockedFromError(detail.code);
    };

    const onFeatureUnavailable = () => {
      void refetch();
    };

    window.addEventListener(BUSINESS_ACCESS_BLOCKED_EVENT, onBlocked);
    window.addEventListener(FEATURE_UNAVAILABLE_EVENT, onFeatureUnavailable);
    return () => {
      window.removeEventListener(BUSINESS_ACCESS_BLOCKED_EVENT, onBlocked);
      window.removeEventListener(FEATURE_UNAVAILABLE_EVENT, onFeatureUnavailable);
    };
  }, [refetch, setBlockedFromError]);

  useEffect(() => {
    if (!businessId) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.business.access(),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.business.current(),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.business.snapshotContext(businessId),
    });
  }, [businessId, queryClient]);

  const blockedOverride = businessId
    ? blockedByBusiness[businessId]
    : undefined;

  const canAccessWorkspace = blockedOverride
    ? false
    : (data?.canAccessWorkspace ?? false);

  const value = useMemo<BusinessAccessContextValue>(
    () => ({
      access: data,
      isLoading: Boolean(businessId) && isLoading,
      isError,
      canAccessWorkspace,
      isBlocked: Boolean(businessId) && !isLoading && !canAccessWorkspace,
      blockedReasonCode: blockedOverride?.code ?? data?.reasonCode,
      capabilityKeys: new Set(
        data?.effectiveCapabilities.map((cap) => cap.key) ?? [],
      ),
      supportContact: supportConfig,
      setBlockedFromError,
      clearBlockedState,
      refetch: () => void refetch(),
    }),
    [
      data,
      businessId,
      isLoading,
      isError,
      canAccessWorkspace,
      blockedOverride,
      setBlockedFromError,
      clearBlockedState,
      refetch,
    ],
  );

  return (
    <BusinessAccessCtx.Provider value={value}>
      {children}
    </BusinessAccessCtx.Provider>
  );
}

export function useBusinessAccessContext(): BusinessAccessContextValue {
  const ctx = useContext(BusinessAccessCtx);
  if (!ctx) {
    throw new Error("useBusinessAccessContext requires BusinessAccessProvider");
  }
  return ctx;
}
