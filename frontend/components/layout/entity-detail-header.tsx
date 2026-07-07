"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ENTITY_DRAWER_HEADER_CLASS } from "@/lib/design/workspace-tokens";

export interface EntityDetailOverflowAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}

interface EntityDetailHeaderProps {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  overflowActions?: EntityDetailOverflowAction[];
  className?: string;
}

export function EntityDetailHeader({
  title,
  subtitle,
  badges,
  actions,
  overflowActions,
  className,
}: EntityDetailHeaderProps) {
  const hasOverflow = overflowActions && overflowActions.length > 0;

  return (
    <header
      className={cn(
        ENTITY_DRAWER_HEADER_CLASS,
        "bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%),linear-gradient(135deg,var(--background)_0%,color-mix(in_oklch,var(--primary)_4%,var(--background))_100%)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {badges ? (
            <div className="mb-2 flex flex-wrap gap-1.5">{badges}</div>
          ) : null}
          <h2 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {hasOverflow ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                {overflowActions.map((action, index) => (
                  <div key={action.id}>
                    {action.destructive && index > 0 ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    <DropdownMenuItem
                      variant={action.destructive ? "destructive" : "default"}
                      onClick={action.onSelect}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}
