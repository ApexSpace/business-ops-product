"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CONTACT_RAIL_ITEMS,
  type ContactRecordsSectionId,
  WORKSPACE_PANEL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";

interface ContactActionRailProps {
  activeSection: ContactRecordsSectionId;
  onSelect: (item: (typeof CONTACT_RAIL_ITEMS)[number]) => void;
  layout?: "vertical" | "grid";
  className?: string;
}

export function ContactActionRail({
  activeSection,
  onSelect,
  layout = "vertical",
  className,
}: ContactActionRailProps) {
  if (layout === "grid") {
    return (
      <div className={cn(WORKSPACE_PANEL_CLASS, "h-full p-4", className)}>
        <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
          Quick navigation
        </p>
        <nav className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {CONTACT_RAIL_ITEMS.map((item) => {
            const isActive = item.sectionId === activeSection;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-medium leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        WORKSPACE_PANEL_CLASS,
        "h-full w-full min-w-0 items-center py-3",
        className,
      )}
    >
      <nav className="flex min-h-0 flex-1 flex-col items-center justify-start gap-1 overflow-y-auto overflow-x-hidden px-1.5">
        {CONTACT_RAIL_ITEMS.map((item) => {
          const isActive = item.sectionId === activeSection;
          const Icon = item.icon;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      item.placeholder && !isActive && "opacity-55",
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <Icon className="size-[17px]" />
                  </button>
                }
              />
              <TooltipContent side="left">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
