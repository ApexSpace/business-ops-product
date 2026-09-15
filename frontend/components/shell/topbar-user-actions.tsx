"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

interface TopbarUserActionsProps {
  actions?: React.ReactNode;
  businessName?: string;
  displayName: string;
  className?: string;
  layout?: "horizontal" | "stacked";
}

export function TopbarUserActions({
  actions,
  businessName,
  displayName,
  className,
  layout = "horizontal",
}: TopbarUserActionsProps) {
  const isStacked = layout === "stacked";

  return (
    <div
      className={cn(
        "flex items-center gap-[10px]",
        isStacked && "flex-col gap-3",
        className,
      )}
    >
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      <Button
        variant="glass"
        size="icon-lg"
        className="relative size-[42px] shrink-0 rounded-full p-0"
        aria-label="Notifications"
        nativeButton={false}
        render={<Link href="/business/settings/notifications" />}
      >
        <Bell className="size-[17px] text-[#5b6478]" />
        <span className="absolute right-[11px] top-[10px] size-[7px] rounded-full bg-destructive" />
      </Button>
      <div
        className={cn(
          "flex items-center gap-[9px]",
          isStacked && "flex-col gap-2 text-center",
        )}
      >
        <div className={cn(isStacked ? "text-center" : "hidden text-right sm:block")}>
          <p className="truncate text-[11px] leading-none text-[#98a1b5]">
            {businessName ?? "Business"}
          </p>
          <p className="mt-1 truncate text-[13px] font-semibold leading-none text-[#12172b] dark:text-foreground">
            {displayName}
          </p>
        </div>
        <UserMenu variant="avatar" className="size-9 shrink-0" />
      </div>
    </div>
  );
}
