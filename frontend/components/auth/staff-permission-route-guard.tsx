"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
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
 *
 * Waits for session restore before evaluating permissions so a hard refresh
 * does not race into the appearance fallback while jwt is still null.
 */
export function StaffPermissionRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { jwt, contexts, isLoading } = useAuth();
  const isPlatformAdmin = hasPlatformBusinessAdminAccess(jwt, contexts);

  const allowed =
    !isLoading &&
    canAccessBusinessStaffRoute(pathname, {
      businessRole: jwt?.businessRole,
      staffPermissions: jwt?.staffPermissions,
      isPlatformAdmin,
    });

  useEffect(() => {
    if (isLoading || allowed) return;
    const fallback = resolveStaffDeniedFallbackHref({
      businessRole: jwt?.businessRole,
      staffPermissions: jwt?.staffPermissions,
    });
    if (fallback !== pathname) {
      router.replace(fallback);
    }
  }, [
    allowed,
    isLoading,
    pathname,
    router,
    jwt?.businessRole,
    jwt?.staffPermissions,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  return <>{children}</>;
}
