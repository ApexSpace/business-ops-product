"use client";

import { usePathname } from "next/navigation";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { isBillingRecoverySafeRoute } from "@/lib/business-access/billing-recovery";
import { isCoreSafeBusinessRoute, resolveRouteCapability } from "@/lib/capabilities/route-capability-map";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";
import { FeatureUnavailableScreen } from "./feature-unavailable-screen";

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname.split("?")[0] ?? pathname;
}

export function CapabilityRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useAppRouter();
  const { canAccessWorkspace, isBillingRecovery, canAccessRoute } =
    useBusinessAccess();

  const path = normalizePath(pathname);

  if (isBillingRecovery) {
    if (isBillingRecoverySafeRoute(path)) {
      return <>{children}</>;
    }
    router.replace("/business/settings/billing");
    return null;
  }

  if (!canAccessWorkspace) {
    return <>{children}</>;
  }

  if (isCoreSafeBusinessRoute(path)) {
    return <>{children}</>;
  }

  const entry = resolveRouteCapability(path);
  if (!entry) {
    return <>{children}</>;
  }

  if (!canAccessRoute(path)) {
    return <FeatureUnavailableScreen moduleKey={entry.moduleKey} />;
  }

  return <>{children}</>;
}
