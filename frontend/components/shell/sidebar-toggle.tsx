"use client";

import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** Circular edge control — same palette as the business/brand icon */
const brandedToggleClassName =
  "flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-elevation-sm transition-[box-shadow,opacity,transform] duration-150 hover:opacity-95 hover:shadow-elevation-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

function BrandSidebarChevron({
  direction,
  className,
}: {
  direction: "left" | "right";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-3 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="M15 6l-6 6 6 6" />
      ) : (
        <path d="M9 6l6 6-6 6" />
      )}
    </svg>
  );
}

function BrandedSidebarCollapseButton({
  label,
  expanded,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  label: string;
  expanded: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(brandedToggleClassName, className)}
      {...props}
    >
      <BrandSidebarChevron direction={expanded ? "left" : "right"} />
    </button>
  );
}

/** Mobile only — opens the sidebar drawer (hamburger). */
export function MobileSidebarMenuTrigger({
  className,
}: {
  className?: string;
}) {
  const { openMobile, toggleSidebar } = useSidebar();

  const open = openMobile;
  const Icon = open ? X : Menu;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      data-slot="mobile-sidebar-trigger"
      className={cn(
        "shrink-0 text-muted-foreground hover:text-foreground md:hidden",
        className,
      )}
      onClick={toggleSidebar}
      aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={open}
    >
      <Icon className="size-5" />
    </Button>
  );
}

/**
 * Desktop — circular collapse control on the sidebar edge, aligned with the
 * Settings footer row (same business-icon colors).
 */
export function SidebarFooterCollapseTrigger({
  className,
}: {
  className?: string;
}) {
  const { isMobile, state, toggleSidebar } = useSidebar();

  if (isMobile) {
    return null;
  }

  const expanded = state === "expanded";
  const label = expanded ? "Collapse sidebar" : "Expand sidebar";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <BrandedSidebarCollapseButton
            label={label}
            expanded={expanded}
            onClick={toggleSidebar}
            data-slot="sidebar-footer-collapse"
            className={cn(
              "absolute top-1/2 right-0 z-50 hidden -translate-y-1/2 translate-x-1/2 md:flex",
              className,
            )}
          />
        }
      />
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
