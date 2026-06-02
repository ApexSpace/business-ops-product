"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  resolvePageMetadata,
  type PageMetadata,
  type PageMetadataContext,
} from "@/config/page-metadata";

interface PageMetadataProviderValue {
  metadata: PageMetadata | null;
  setOverride: (override: Partial<PageMetadata> | null) => void;
}

const PageMetadataContext = React.createContext<PageMetadataProviderValue | null>(
  null,
);

export function PageMetadataProvider({
  context,
  children,
}: {
  context: PageMetadataContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [override, setOverride] = React.useState<Partial<PageMetadata> | null>(
    null,
  );

  React.useEffect(() => {
    setOverride(null);
  }, [pathname]);

  const base = resolvePageMetadata(pathname, context);
  const metadata = base
    ? { ...base, ...override }
    : override
      ? { title: override.title ?? "Page", ...override }
      : null;

  const value = React.useMemo(
    () => ({
      metadata,
      setOverride,
    }),
    [metadata],
  );

  return (
    <PageMetadataContext.Provider value={value}>
      {children}
    </PageMetadataContext.Provider>
  );
}

export function usePageMetadata() {
  const ctx = React.useContext(PageMetadataContext);
  return ctx?.metadata ?? null;
}

export function useSetPageMetadata() {
  const ctx = React.useContext(PageMetadataContext);
  return ctx?.setOverride ?? (() => {});
}
