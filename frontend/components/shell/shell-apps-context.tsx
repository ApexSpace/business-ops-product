"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppsLauncherSheet } from "@/components/shell/apps-launcher";
import type { ShellNavItem } from "@/lib/types/shell-nav";

interface ShellAppsContextValue {
  appsItems: ShellNavItem[];
  appsOpen: boolean;
  setAppsOpen: (open: boolean) => void;
  openApps: () => void;
}

const ShellAppsContext = createContext<ShellAppsContextValue | null>(null);

export function ShellAppsProvider({
  appsItems,
  children,
}: {
  appsItems: ShellNavItem[];
  children: ReactNode;
}) {
  const [appsOpen, setAppsOpen] = useState(false);
  const openApps = useCallback(() => setAppsOpen(true), []);

  const value = useMemo(
    () => ({ appsItems, appsOpen, setAppsOpen, openApps }),
    [appsItems, appsOpen, openApps],
  );

  return (
    <ShellAppsContext.Provider value={value}>
      {children}
      <AppsLauncherSheet
        items={appsItems}
        open={appsOpen}
        onOpenChange={setAppsOpen}
      />
    </ShellAppsContext.Provider>
  );
}

export function useShellApps() {
  const ctx = useContext(ShellAppsContext);
  if (!ctx) {
    return {
      appsItems: [] as ShellNavItem[],
      appsOpen: false,
      setAppsOpen: (_open: boolean) => undefined,
      openApps: () => undefined,
    };
  }
  return ctx;
}
