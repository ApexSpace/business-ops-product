"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/provider";
import { hasPlatformBusinessAdminAccess } from "@/features/auth/permissions/permissions-legacy";
import {
  canAccessBusinessStaffRoute,
  resolveStaffDeniedFallbackHref,
} from "@/lib/config/navigation/staff-route-permissions";

/**
 * Blocks MEMBER users from opening app/settings routes that require
 * a staff permission they were not granted.
 */
export function StaffPermissionRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { jwt, contexts } = useAuth();
  const isPlatformAdmin = hasPlatformBusinessAdminAccess(jwt, contexts);

  const allowed = canAccessBusinessStaffRoute(pathname, {
    businessRole: jwt?.businessRole,
    staffPermissions: jwt?.staffPermissions,
    isPlatformAdmin,
  });

  useEffect(() => {
    if (allowed) return;
    const fallback = resolveStaffDeniedFallbackHref({
      businessRole: jwt?.businessRole,
      staffPermissions: jwt?.staffPermissions,
    });
    if (fallback !== pathname) {
      router.replace(fallback);
    }
  }, [allowed, pathname, router, jwt?.businessRole, jwt?.staffPermissions]);

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  return <>{children}</>;
}
