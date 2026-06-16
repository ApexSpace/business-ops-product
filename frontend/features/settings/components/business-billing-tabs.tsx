"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const BUSINESS_BILLING_TABS = [
  { value: "overview", label: "Overview" },
  { value: "invoices", label: "Payments / Invoices" },
] as const;

export type BusinessBillingTab =
  (typeof BUSINESS_BILLING_TABS)[number]["value"];

export interface BusinessBillingTabsProps {
  value: BusinessBillingTab;
  onValueChange: (value: BusinessBillingTab) => void;
  className?: string;
}

export function BusinessBillingTabs({
  value,
  onValueChange,
  className,
}: BusinessBillingTabsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-lg border border-border/70 bg-muted/30 p-1",
        className,
      )}
    >
      {BUSINESS_BILLING_TABS.map((tab) => (
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
