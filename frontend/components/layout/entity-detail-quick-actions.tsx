"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EntityDetailQuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface EntityDetailQuickActionsProps {
  actions: EntityDetailQuickAction[];
  className?: string;
}

export function EntityDetailQuickActions({
  actions,
  className,
}: EntityDetailQuickActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 border-y border-border/70 py-3",
        className,
      )}
    >
      {actions.map((action) => (
        <Button
          key={action.id}
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto min-h-[2.75rem] flex-col gap-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
