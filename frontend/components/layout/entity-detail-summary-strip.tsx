"use client";

import { useState } from "react";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { cn } from "@/lib/utils";
import { ENTITY_DRAWER_SUMMARY_CLASS } from "@/lib/design/workspace-tokens";

interface EntityDetailSummaryStripProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function EntityDetailSummaryStrip({
  children,
  defaultOpen = false,
  className,
}: EntityDetailSummaryStripProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn(ENTITY_DRAWER_SUMMARY_CLASS, className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-foreground"
        aria-expanded={open}
      >
        <span>Details</span>
        <NavArrowIcon
          direction={open ? "up" : "down"}
          size="sm"
          className="text-muted-foreground"
        />
      </button>
      {open ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}
