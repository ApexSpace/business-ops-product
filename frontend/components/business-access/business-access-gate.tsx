"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { useAuth } from "@/lib/auth/provider";
import { isBillingRecoverySafeRoute } from "@/lib/business-access/billing-recovery";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";
import { BusinessAccessBlockedScreen } from "./business-access-blocked-screen";
import { BusinessShellBootLoader } from "./business-shell-boot-loader";

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname.split("?")[0] ?? pathname;
}

function useBusinessShellBootstrap() {
  const { isLoading: authLoading, jwt, isAuthenticated } = useAuth();
  const { isAccessResolved } = useBusinessAccess();

  const businessId =
    jwt?.context === "business" ? jwt.businessId : undefined;

  const awaitingBootstrap =
    authLoading ||
    (isAuthenticated &&
      jwt?.context === "business" &&
      (!businessId || !isAccessResolved));

  return { isBootstrapping: awaitingBootstrap };
}

export function BusinessAccessGate({ children }: { children: React.ReactNode }) {
  const router = useAppRouter();
  const pathname = usePathname();
  const { access, isBlocked, isBillingRecovery, blockedReasonCode } =
    useBusinessAccess();
  const { isBootstrapping } = useBusinessShellBootstrap();
  const billingSafe = isBillingRecoverySafeRoute(normalizePath(pathname));

  useEffect(() => {
    if (!isBillingRecovery || isBootstrapping) return;
    const path = normalizePath(pathname);
    if (!isBillingRecoverySafeRoute(path)) {
      router.replace("/business/settings/billing");
    }
  }, [isBillingRecovery, isBootstrapping, pathname, router]);

  if (isBootstrapping) {
    return <BusinessShellBootLoader />;
  }

  if (isBillingRecovery && !billingSafe) {
    return <BusinessShellBootLoader />;
  }

  if (isBlocked) {
    return (
      <BusinessAccessBlockedScreen
        access={access}
        reasonCode={blockedReasonCode}
      />
    );
  }

  return <>{children}</>;
}
