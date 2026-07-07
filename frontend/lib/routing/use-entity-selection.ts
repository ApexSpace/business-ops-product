"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildEntitySelectionParams,
  ENTITY_ID_PARAM,
  ENTITY_TAB_PARAM,
  readEntityIdFromSearchParams,
} from "@/lib/routing/entity-selection";

export interface UseEntitySelectionOptions {
  /** Additional legacy param keys to read (merged with defaults). */
  legacyIdParams?: string[];
  defaultTab?: string;
}

export function useEntitySelection(options: UseEntitySelectionOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingClose, setPendingClose] = useState(false);

  const legacyParams = useMemo(
    () => options.legacyIdParams ?? [],
    [options.legacyIdParams],
  );

  const readKeys = useMemo(
    () => ["id", "product", "contact", "selected", "sale", ...legacyParams],
    [legacyParams],
  );

  const selectedId = useMemo(
    () => readEntityIdFromSearchParams(searchParams, readKeys),
    [searchParams, readKeys],
  );

  useEffect(() => {
    if (!selectedId) {
      setPendingClose(false);
    }
  }, [selectedId]);

  const tab =
    searchParams.get(ENTITY_TAB_PARAM) ?? options.defaultTab ?? null;

  const isOpen = !!selectedId && !pendingClose;

  const replaceParams = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const setSelectedId = useCallback(
    (id: string | null) => {
      setPendingClose(false);
      const next = buildEntitySelectionParams(searchParams, { id });
      replaceParams(next);
    },
    [searchParams, replaceParams],
  );

  const setTab = useCallback(
    (tabValue: string | null) => {
      const next = buildEntitySelectionParams(searchParams, { tab: tabValue });
      replaceParams(next);
    },
    [searchParams, replaceParams],
  );

  const clearSelection = useCallback(() => {
    if (!selectedId) return;
    setPendingClose(true);
    const next = buildEntitySelectionParams(searchParams, {
      id: null,
      tab: null,
    });
    replaceParams(next);
  }, [searchParams, replaceParams, selectedId]);

  return {
    selectedId,
    tab,
    isOpen,
    setSelectedId,
    setTab,
    clearSelection,
    idParam: ENTITY_ID_PARAM,
    tabParam: ENTITY_TAB_PARAM,
  };
}
