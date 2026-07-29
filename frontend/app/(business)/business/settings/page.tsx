"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/provider";
import { hasPlatformBusinessAdminAccess } from "@/features/auth/permissions/permissions-legacy";
import {
  ADMIN_DEFAULT_SETTINGS_HREF,
  MEMBER_DEFAULT_SETTINGS_HREF,
} from "@/features/team/permissions/staff-permissions";

export default function BusinessSettingsIndexPage() {
  const router = useRouter();
  const { jwt, contexts } = useAuth();
  const isPlatformAdmin = hasPlatformBusinessAdminAccess(jwt, contexts);
  const isAdmin =
    isPlatformAdmin ||
    jwt?.businessRole === "OWNER" ||
    jwt?.businessRole === "ADMIN";

  useEffect(() => {
    router.replace(
      isAdmin ? ADMIN_DEFAULT_SETTINGS_HREF : MEMBER_DEFAULT_SETTINGS_HREF,
    );
  }, [isAdmin, router]);

  return null;
}
