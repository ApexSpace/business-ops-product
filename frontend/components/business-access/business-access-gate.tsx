"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { isBillingRecoverySafeRoute } from "@/lib/business-access/billing-recovery";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";
import { BusinessAccessBlockedScreen } from "./business-access-blocked-screen";

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname.split("?")[0] ?? pathname;
}

export function BusinessAccessGate({ children }: { children: React.ReactNode }) {
  const router = useAppRouter();
  const pathname = usePathname();
  const { access, isLoading, isBlocked, isBillingRecovery, blockedReasonCode } =
    useBusinessAccess();

  useEffect(() => {
    if (!isBillingRecovery || isLoading) return;
    const path = normalizePath(pathname);
    if (!isBillingRecoverySafeRoute(path)) {
      router.replace("/business/settings/billing");
    }
  }, [isBillingRecovery, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <BusinessAccessBlockedScreen
        access={access}
        reasonCode={blockedReasonCode}
      />
    );
  }

  if (isBillingRecovery) {
    const path = normalizePath(pathname);
    if (!isBillingRecoverySafeRoute(path)) {
      return (
        <div className="flex min-h-svh items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
  }

  return <>{children}</>;
}
