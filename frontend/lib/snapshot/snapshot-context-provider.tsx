"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { SnapshotContext } from "@/features/platform/types/snapshot";
import { DEFAULT_SNAPSHOT_CONTEXT } from "@/lib/config/snapshot/default-snapshot-context";
import { useAuth } from "@/lib/auth/provider";
import { snapshotContextQueryOptions } from "./snapshot-context-query";
import {
  readStoredSnapshotContext,
  type StoredSnapshotContext,
  storedToSnapshotContext,
  writeStoredSnapshotContext,
} from "./snapshot-context-storage";
import { createTerminologyResolver } from "./resolve-terminology";

const EMPTY_TENANT_DASHBOARD: SnapshotContext["dashboard"] = {
  widgets: [],
  quickLinks: [],
};

function tenantFallbackContext(): SnapshotContext {
  return {
    ...DEFAULT_SNAPSHOT_CONTEXT,
    dashboard: EMPTY_TENANT_DASHBOARD,
  };
}

/** Cached sessionStorage must not drive widget counts before a fresh API fetch. */
function placeholderSnapshotContext(stored: StoredSnapshotContext): SnapshotContext {
  const context = storedToSnapshotContext(stored);
  return {
    ...context,
    dashboard: {
      ...context.dashboard,
      widgets: [],
    },
  };
}

interface SnapshotContextValue {
  context: SnapshotContext;
  isLoading: boolean;
  isError: boolean;
  t: (key: string, fallback: string) => string;
}

const SnapshotCtx = createContext<SnapshotContextValue | null>(null);

export function SnapshotContextProvider({ children }: { children: ReactNode }) {
  const { jwt } = useAuth();
  const businessId =
    jwt?.context === "business" ? jwt.businessId : undefined;

  const stored = useMemo(
    () => readStoredSnapshotContext(businessId),
    [businessId],
  );

  const placeholderData = useMemo(() => {
    if (!stored || stored.businessId !== businessId) return undefined;
    return placeholderSnapshotContext(stored);
  }, [businessId, stored]);

  const { data, isLoading, isError } = useQuery({
    ...snapshotContextQueryOptions(businessId),
    placeholderData,
  });

  useEffect(() => {
    if (!businessId || !data) return;
    writeStoredSnapshotContext(businessId, data);
  }, [businessId, data]);

  const context = data ?? tenantFallbackContext();
  const t = useMemo(
    () => createTerminologyResolver(context.terminology),
    [context.terminology],
  );

  const value = useMemo(
    () => ({
      context,
      isLoading: isLoading && !placeholderData,
      isError,
      t,
    }),
    [context, isLoading, placeholderData, isError, t],
  );

  return (
    <SnapshotCtx.Provider value={value}>{children}</SnapshotCtx.Provider>
  );
}

export function useSnapshotContextValue(): SnapshotContextValue {
  const ctx = useContext(SnapshotCtx);
  if (!ctx) {
    const t = createTerminologyResolver(DEFAULT_SNAPSHOT_CONTEXT.terminology);
    return {
      context: tenantFallbackContext(),
      isLoading: false,
      isError: false,
      t,
    };
  }
  return ctx;
}
