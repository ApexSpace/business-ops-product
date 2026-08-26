/**
 * Shared Settings / Reports workspace nav recipes.
 * Visual values come from globals.css tokens; this file is class composition only.
 */

export const WORKSPACE_NAV_PANEL_CLASS =
  "flex h-full min-h-0 flex-col gap-4 p-4";

export const WORKSPACE_NAV_SECTION_TRIGGER_CLASS =
  "px-2 py-2.5 text-sm font-semibold text-foreground hover:no-underline";

export const WORKSPACE_NAV_ITEM_CLASS =
  "flex min-h-[var(--control-height)] min-w-0 items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const WORKSPACE_NAV_ITEM_ACTIVE_CLASS =
  "border-l-2 border-primary bg-primary-tint font-medium text-primary";

export const WORKSPACE_NAV_ITEM_IDLE_CLASS =
  "text-muted-foreground hover:bg-muted/60 hover:text-foreground";
