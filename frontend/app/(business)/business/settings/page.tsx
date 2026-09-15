"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/provider";
import { hasPlatformBusinessAdminAccess } from "@/features/auth/permissions/permissions-legacy";
import {
  ADMIN_DEFAULT_SETTINGS_HREF,
  MEMBER_DEFAULT_SETTINGS_HREF,
} from "@/features/team/permissions/staff-permissions";
import { useHydrated } from "@/lib/hooks/use-hydrated";

const LG_QUERY = "(min-width: 1024px)";

export default function BusinessSettingsIndexPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { jwt, contexts } = useAuth();
  const isPlatformAdmin = hasPlatformBusinessAdminAccess(jwt, contexts);
  const isAdmin =
    isPlatformAdmin ||
    jwt?.businessRole === "OWNER" ||
    jwt?.businessRole === "ADMIN";
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(LG_QUERY);
    const onChange = () => setIsLg(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!hydrated || !isLg) return;
    router.replace(
      isAdmin ? ADMIN_DEFAULT_SETTINGS_HREF : MEMBER_DEFAULT_SETTINGS_HREF,
    );
  }, [hydrated, isAdmin, isLg, router]);

  return null;
}
