"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ListSearchParamSchema = Record<string, { default: string }>;

type SchemaDefaults<T extends ListSearchParamSchema> = {
  [K in keyof T]: string;
};

/**
 * Syncs list filters with URL search params (refresh-safe, shareable).
 * Pair debounced text fields with `useDebouncedValue(params.search)` before querying.
 */
export function useListSearchParams<T extends ListSearchParamSchema>(
  schema: T,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaults = useMemo(() => {
    const d = {} as SchemaDefaults<T>;
    for (const key of Object.keys(schema) as (keyof T)[]) {
      d[key] = schema[key].default as SchemaDefaults<T>[keyof T];
    }
    return d;
  }, [schema]);

  const params = useMemo(() => {
    const current = { ...defaults };
    for (const key of Object.keys(schema) as (keyof T)[]) {
      const fromUrl = searchParams.get(String(key));
      if (fromUrl !== null) {
        current[key] = fromUrl as SchemaDefaults<T>[typeof key];
      }
    }
    return current;
  }, [searchParams, schema, defaults]);

  const setParams = useCallback(
    (
      updates: Partial<SchemaDefaults<T>>,
      opts?: { resetPage?: boolean },
    ) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        const def = defaults[key as keyof T];
        if (value === undefined || value === null || value === "" || value === def) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }

      if (opts?.resetPage && !("page" in updates) && "page" in schema) {
        const pageDefault = schema.page?.default ?? "1";
        if (pageDefault === "1") next.delete("page");
        else next.set("page", pageDefault);
      }

      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, defaults, schema],
  );

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number("limit" in params ? params.limit : 20) || 20);

  return {
    params,
    page,
    limit,
    setParams,
    defaults,
  };
}
