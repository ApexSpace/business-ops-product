"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export interface EntityDetailTabItem {
  value: string;
  label: React.ReactNode;
}

interface EntityDetailTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: EntityDetailTabItem[];
  className?: string;
}

export function EntityDetailTabs({
  value,
  onValueChange,
  tabs,
  className,
}: EntityDetailTabsProps) {
  useEffect(() => {
    if (tabs.length <= 1) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      const digitMatch = event.code.match(/^Digit([1-9])$/);
      if (!digitMatch) {
        return;
      }
      const index = Number.parseInt(digitMatch[1]!, 10) - 1;
      if (index < 0 || index >= tabs.length) {
        return;
      }
      const tab = tabs[index];
      if (!tab) {
        return;
      }
      event.preventDefault();
      onValueChange(tab.value);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onValueChange, tabs]);

  if (tabs.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex shrink-0 gap-1 overflow-x-auto border-b border-border/70 px-6 scrollbar-thin",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-keyshortcuts={`Alt+${index + 1}`}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "relative shrink-0 px-3 py-3 text-[13px] font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {active ? (
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
