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
  /**
   * `default` — full-width entity drawer tabs.
   * `panel` — nested Figma underline tabs (Client Details timeline column).
   */
  variant?: "default" | "panel";
  className?: string;
  "aria-label"?: string;
}

export function EntityDetailTabs({
  value,
  onValueChange,
  tabs,
  variant = "default",
  className,
  "aria-label": ariaLabel = "Sections",
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

  const isPanel = variant === "panel";

  return (
    <div
      className={cn(
        isPanel
          ? "flex min-h-14 shrink-0 items-end gap-6 overflow-x-auto border-b border-[var(--drawer-header-border)] bg-white px-4 pt-2 scrollbar-thin sm:px-6"
          : "flex shrink-0 gap-1 overflow-x-auto border-b border-border/70 px-6 scrollbar-thin",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
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
              "relative shrink-0 whitespace-nowrap transition-colors",
              isPanel
                ? cn(
                    "min-h-11 border-b-2 px-0 pb-3 text-[14px] leading-none",
                    active
                      ? "border-violet-primary-normal font-semibold text-violet-primary-normal"
                      : "border-transparent font-medium text-[var(--drawer-text-meta)] hover:text-violet-primary-normal",
                  )
                : cn(
                    "px-3 py-3 text-[13px] font-medium",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ),
            )}
          >
            {tab.label}
            {!isPanel && active ? (
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
