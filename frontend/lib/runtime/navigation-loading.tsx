"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type LoadingPhase = "idle" | "loading" | "completing";

interface NavigationLoadingContextValue {
  start: () => void;
  stop: () => void;
  isLoading: boolean;
}

const NavigationLoadingContext =
  createContext<NavigationLoadingContextValue | null>(null);

const FAILSAFE_MS = 30_000;
const COMPLETE_MS = 280;

function NavigationLoadingBar({ phase }: { phase: LoadingPhase }) {
  const visible = phase !== "idle";

  return (
    <div
      role="progressbar"
      aria-hidden={!visible}
      aria-busy={phase === "loading"}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-primary/20 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      {phase === "loading" ? (
        <div className="navigation-loading-bar h-full w-1/3 bg-primary shadow-[0_0_10px] shadow-primary/40" />
      ) : null}
      {phase === "completing" ? (
        <div className="h-full w-full bg-primary transition-all duration-200 ease-out" />
      ) : null}
    </div>
  );
}

function NavigationLoadingProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<LoadingPhase>("idle");
  const activeRef = useRef(false);
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const clearTimers = useCallback(() => {
    if (failsafeRef.current) {
      clearTimeout(failsafeRef.current);
      failsafeRef.current = null;
    }
    if (completeRef.current) {
      clearTimeout(completeRef.current);
      completeRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setPhase("completing");
    completeRef.current = setTimeout(() => setPhase("idle"), COMPLETE_MS);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    activeRef.current = true;
    setPhase("loading");
    failsafeRef.current = setTimeout(() => stop(), FAILSAFE_MS);
  }, [clearTimers, stop]);

  useEffect(() => {
    if (activeRef.current) {
      stop();
    }
  }, [routeKey, stop]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element).closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const current = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
      const next = `${url.pathname}${url.search}`;
      if (next === current) return;

      start();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, searchParams, start]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const value = useMemo(
    () => ({
      start,
      stop,
      isLoading: phase !== "idle",
    }),
    [start, stop, phase],
  );

  return (
    <NavigationLoadingContext.Provider value={value}>
      <NavigationLoadingBar phase={phase} />
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <NavigationLoadingProviderInner>{children}</NavigationLoadingProviderInner>
    </Suspense>
  );
}

export function useNavigationLoading(): NavigationLoadingContextValue {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error(
      "useNavigationLoading must be used within NavigationLoadingProvider",
    );
  }
  return ctx;
}
