"use client";

import { usePathname } from "next/navigation";
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
  const { canAccessWorkspace, hasModule } = useBusinessAccess();

  if (!canAccessWorkspace) {
    return <>{children}</>;
  }

  const path = normalizePath(pathname);

  if (isCoreSafeBusinessRoute(path)) {
    return <>{children}</>;
  }

  const entry = resolveRouteCapability(path);
  if (!entry) {
    return <>{children}</>;
  }

  if (!hasModule(entry.moduleKey)) {
    return <FeatureUnavailableScreen moduleKey={entry.moduleKey} />;
  }

  return <>{children}</>;
}
