"use client";

import { MoreHorizontal } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DRAWER_HEADER_ACTION_CLASS,
  DRAWER_MOBILE_HEADER_ACTION_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface EntityDetailOverflowAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}

interface EntityDetailHeaderProps {
  actions?: React.ReactNode;
  overflowActions?: EntityDetailOverflowAction[];
  /** `on-brand` — white ghost control for mobile-brand drawer headers. */
  tone?: "default" | "on-brand";
  className?: string;
}

/**
 * Header action cluster for entity drawers (inline actions + overflow).
 * Chrome lives on DrawerShell — this is not a second header.
 */
export function EntityDetailHeader({
  actions,
  overflowActions,
  tone = "default",
  className,
}: EntityDetailHeaderProps) {
  const hasOverflow = overflowActions && overflowActions.length > 0;
  if (!actions && !hasOverflow) {
    return null;
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {actions}
      {hasOverflow ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <IconButton
                variant="ghost"
                size={tone === "on-brand" ? "icon" : "icon-sm"}
                aria-label="More actions"
                className={
                  tone === "on-brand"
                    ? DRAWER_MOBILE_HEADER_ACTION_CLASS
                    : DRAWER_HEADER_ACTION_CLASS
                }
              >
                <MoreHorizontal className="size-4" />
              </IconButton>
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
  );
}
