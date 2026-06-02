"use client";

import { Button } from "@/components/ui/button";
import {
  INTEGRATION_CATEGORY_TABS,
  type IntegrationCategory,
} from "@/lib/integrations";
import { cn } from "@/lib/utils";

export interface IntegrationCategoryTabsProps {
  value: IntegrationCategory | "ALL";
  onValueChange: (value: IntegrationCategory | "ALL") => void;
  className?: string;
}

export function IntegrationCategoryTabs({
  value,
  onValueChange,
  className,
}: IntegrationCategoryTabsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-lg border border-border/70 bg-muted/30 p-1",
        className,
      )}
    >
      {INTEGRATION_CATEGORY_TABS.map((tab) => (
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
  );
}
