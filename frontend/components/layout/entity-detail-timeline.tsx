"use client";

import { cn } from "@/lib/utils";

export type EntityDetailTimelineDotVariant =
  | "default"
  | "appointment"
  | "confirmed"
  | "note"
  | "system";

export interface EntityDetailTimelineItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  dotVariant?: EntityDetailTimelineDotVariant;
}

interface EntityDetailTimelineProps {
  items: EntityDetailTimelineItem[];
  className?: string;
}

const DOT_CLASS: Record<EntityDetailTimelineDotVariant, string> = {
  default: "bg-primary",
  appointment: "bg-primary",
  confirmed: "bg-success",
  note: "bg-warning",
  system: "bg-muted-foreground",
};

export function EntityDetailTimeline({
  items,
  className,
}: EntityDetailTimelineProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative space-y-0", className)}>
      <div
        className="absolute bottom-2 left-[7px] top-2 w-px bg-border"
        aria-hidden
      />
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="relative flex gap-3 pl-0">
            <span
              className={cn(
                "relative z-[1] mt-1.5 size-3.5 shrink-0 rounded-full ring-2 ring-background",
                DOT_CLASS[item.dotVariant ?? "default"],
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">
                  {item.title}
                </div>
                {item.actions ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    {item.actions}
                  </div>
                ) : null}
              </div>
              {item.subtitle ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.subtitle}
                </p>
              ) : null}
              {item.meta ? (
                <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
