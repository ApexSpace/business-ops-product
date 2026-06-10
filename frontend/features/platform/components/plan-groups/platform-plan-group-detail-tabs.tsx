"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PLATFORM_PLAN_GROUP_DETAIL_TABS = [
  { value: "overview", label: "Overview" },
  { value: "tiers", label: "Tiers" },
  { value: "style", label: "Style" },
  { value: "preview", label: "Preview" },
] as const;

export type PlatformPlanGroupDetailTab =
  (typeof PLATFORM_PLAN_GROUP_DETAIL_TABS)[number]["value"];

type PlatformPlanGroupDetailTabsProps = {
  value: PlatformPlanGroupDetailTab;
  onValueChange: (tab: PlatformPlanGroupDetailTab) => void;
  className?: string;
};

export function PlatformPlanGroupDetailTabs({
  value,
  onValueChange,
  className,
}: PlatformPlanGroupDetailTabsProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border/70 bg-muted/30 p-1",
        className,
      )}
    >
      <div className="flex min-w-max gap-1 sm:min-w-0 sm:flex-wrap">
        {PLATFORM_PLAN_GROUP_DETAIL_TABS.map((tab) => (
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
