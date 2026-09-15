"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import { getServicesTree } from "@/features/services/api/service-workspace.api";

function isTransientBackendError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return (
    error.status === 0 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    error.code === "BACKEND_UNAVAILABLE" ||
    error.code === "SERVICE_TIMEOUT"
  );
}

export function useServicesTree(search: string) {
  const query = useQuery({
    queryKey: queryKeys.services.tree(),
    queryFn: getServicesTree,
    retry: (failureCount, err) =>
      isTransientBackendError(err) ? failureCount < 4 : failureCount < 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
  });

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!query.data?.categories) return [];
    if (!q) return query.data.categories;
    return query.data.categories
      .map((cat) => ({
        ...cat,
        services: cat.services.filter((s) =>
          s.name.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (cat) =>
          cat.name.toLowerCase().includes(q) || cat.services.length > 0,
      );
  }, [query.data, search]);

  return {
    ...query,
    categories: query.data?.categories ?? [],
    filteredCategories,
  };
}
