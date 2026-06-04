"use client";

import type { ReactNode } from "react";
import { useCan } from "@/features/auth/permissions/use-can";
import type { Permission } from "@/features/auth/permissions/permissions";

type CanProps = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  /** When false, hide entirely; when true, show disabled with title tooltip */
  showDisabled?: boolean;
  disabledReason?: string;
};

export function Can({
  permission,
  children,
  fallback = null,
  showDisabled = true,
  disabledReason = "You do not have permission for this action",
}: CanProps) {
  const allowed = useCan(permission);

  if (allowed) return <>{children}</>;

  if (!showDisabled) return <>{fallback}</>;

  return (
    <span
      className="inline-flex cursor-not-allowed opacity-50"
      aria-disabled
      title={disabledReason}
    >
      {children}
    </span>
  );
}
