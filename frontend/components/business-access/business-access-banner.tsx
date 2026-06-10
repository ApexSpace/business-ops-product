"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";
import { getBannerMessage } from "./business-access-messages";
import { cn } from "@/lib/utils";

export function BusinessAccessBanner() {
  const { access, canAccessWorkspace } = useBusinessAccess();

  if (!canAccessWorkspace || !access) return null;

  const banner = getBannerMessage(access);
  if (!banner) return null;

  const Icon = banner.tone === "warning" ? AlertTriangle : Info;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 text-xs sm:gap-2 sm:text-sm",
        banner.tone === "warning"
          ? "text-amber-700 dark:text-amber-400"
          : "text-muted-foreground",
      )}
      role="status"
    >
      <Icon className="size-3.5 shrink-0 sm:size-4" />
      <p className="min-w-0 truncate">{banner.message}</p>
    </div>
  );
}
