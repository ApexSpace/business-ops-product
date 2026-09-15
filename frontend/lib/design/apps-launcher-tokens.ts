import { cn } from "@/lib/utils";

/**
 * Apps panel footer — full-width bar (Figma Aside “Manage apps”).
 * Overrides SheetFooter / DrawerShell `sm:justify-end` so the action can fill.
 */
export const APPS_LAUNCHER_FOOTER_CLASS = cn(
  "!flex w-full min-w-0 !flex-col !items-stretch !justify-start !gap-0",
  "!border-0 !bg-background !p-0",
  "pb-[env(safe-area-inset-bottom,0px)]",
  "sm:!flex-col sm:!items-stretch sm:!justify-start",
);

/**
 * Manage apps control — fill the footer, centered icon + label.
 * Height hugs `--control-height`; pad/gap `--spacing-3`; radius `--radius-xs`.
 */
export const APPS_LAUNCHER_MANAGE_CLASS = cn(
  "h-auto min-h-[var(--control-height)] w-full max-w-none shrink-0 justify-center",
  "gap-[var(--spacing-3)] rounded-[var(--radius-xs)] border-border",
  "px-[var(--spacing-3)] py-[var(--spacing-3)] shadow-none",
);
