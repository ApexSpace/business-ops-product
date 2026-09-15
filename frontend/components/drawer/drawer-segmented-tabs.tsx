"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DRAWER_TYPE_TAB_ACTIVE_CLASS,
  DRAWER_TYPE_TAB_INACTIVE_CLASS,
  DRAWER_TYPE_TABS_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerSegmentedTabOption {
  value: string;
  label: string;
  onClick?: (event: React.MouseEvent) => void;
}

export interface DrawerSegmentedTabsProps {
  value: string;
  options: DrawerSegmentedTabOption[];
  className?: string;
  size?: "default" | "sm";
}

export function DrawerSegmentedTabs({
  value,
  options,
  className,
  size = "default",
}: DrawerSegmentedTabsProps) {
  const textClass = size === "sm" ? "!text-[13px]" : undefined;

  return (
    <Tabs value={value} className={cn("w-full gap-0", className)}>
      <TabsList className={DRAWER_TYPE_TABS_CLASS}>
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className={cn(
              textClass,
              value === option.value
                ? DRAWER_TYPE_TAB_ACTIVE_CLASS
                : DRAWER_TYPE_TAB_INACTIVE_CLASS,
            )}
            onClick={option.onClick}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
