"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PLATFORM_BUSINESS_DETAIL_TABS = [
  { value: "overview", label: "Overview" },
  { value: "access", label: "Access" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "payments", label: "Payments" },
  { value: "profile", label: "Profile" },
  { value: "team", label: "Team" },
  { value: "activity", label: "Activity" },
] as const;

export type PlatformBusinessDetailTab =
  (typeof PLATFORM_BUSINESS_DETAIL_TABS)[number]["value"];

export interface PlatformBusinessDetailTabsProps {
  value: PlatformBusinessDetailTab;
  onValueChange: (value: PlatformBusinessDetailTab) => void;
  className?: string;
}

export function PlatformBusinessDetailTabs({
  value,
  onValueChange,
  className,
}: PlatformBusinessDetailTabsProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border/70 bg-muted/30 p-1",
        className,
      )}
    >
      <div className="flex min-w-max gap-1 sm:min-w-0 sm:flex-wrap">
        {PLATFORM_BUSINESS_DETAIL_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={value === tab.value ? "secondary" : "ghost"}
            className="h-8 shrink-0"
            onClick={() => onValueChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
