/**
 * Shared Forms builder recipes.
 * Visual values come from globals.css / theme; this file is class composition only.
 *
 * Page 1 of the PandaCue Figma file has no dedicated Forms builder/list frames.
 * These recipes map the Forms product onto existing app primitives:
 *   List table     → Sales (`191:6598`) / Clients (`976:10020`)
 *   Editor header  → Flows editor (`1611:23903`) + drawer header tokens
 *   Side panes     → Settings workspace nav (`WORKSPACE_NAV_*`)
 *   Canvas / empty → Settings form shell (`SETTINGS_*`)
 *   Field/Form tabs → Drawer segmented tabs (`DRAWER_TYPE_TAB*`)
 *
 * Native `<input type="color">` requires a 6-digit hex. `FORM_ACCENT_COLOR_HEX`
 * must stay equal to `--pc-violet-primary-normal` in codesol-default-theme.css.
 */

import {
  DRAWER_TYPE_TAB_ACTIVE_CLASS,
  DRAWER_TYPE_TAB_INACTIVE_CLASS,
  DRAWER_TYPE_TABS_CLASS,
} from "@/lib/design/drawer-tokens";
import { SETTINGS_FORM_SURFACE_CLASS } from "@/lib/design/settings-form-tokens";
import {
  WORKSPACE_NAV_ITEM_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  WORKSPACE_NAV_SECTION_TRIGGER_CLASS,
} from "@/lib/design/workspace-nav-tokens";
import { cn } from "@/lib/utils";

/** `--pc-violet-primary-normal` — default lead-form accent for color pickers / JSON. */
export const FORM_ACCENT_COLOR_HEX = "#7e3bed";

/** Three-pane builder: palette | canvas | settings. Width matches Settings nav. */
export const FORMS_BUILDER_SHELL_GRID_CLASS =
  "grid h-full min-h-0 flex-1 grid-cols-1 items-stretch overflow-hidden lg:grid-cols-[var(--workspace-nav-width)_minmax(0,1fr)_var(--workspace-nav-width)]";

/** Flows/Settings editor chrome — white bar, drawer header divider. */
export const FORMS_BUILDER_TOPBAR_CLASS = cn(
  "sticky top-0 z-20 flex flex-wrap items-center gap-3",
  "border-b border-[var(--drawer-header-border)] bg-white",
  "px-[var(--page-padding-x)] py-drawer-header-y",
);

/** Entity/editor title — Figma primary/900. */
export const FORMS_BUILDER_TITLE_CLASS =
  "truncate text-[18px] font-bold leading-[22px] text-violet-primary-darker";

export const FORMS_BUILDER_META_CLASS =
  "text-[12px] font-medium leading-none text-[var(--drawer-text-secondary)]";

/** Palette / settings asides — Settings workspace nav surface. */
export const FORMS_BUILDER_PALETTE_ASIDE_CLASS = cn(
  "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-r border-border bg-muted/20",
  SETTINGS_FORM_SURFACE_CLASS,
);

export const FORMS_BUILDER_SETTINGS_ASIDE_CLASS = cn(
  "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-l border-border bg-muted/20",
  SETTINGS_FORM_SURFACE_CLASS,
);

export const FORMS_BUILDER_PALETTE_HEADER_CLASS =
  "shrink-0 space-y-[var(--workspace-nav-search-gap)] px-[var(--workspace-nav-padding-x)] pb-[var(--workspace-nav-search-gap)] pt-[var(--workspace-nav-padding-y)] [&_[data-slot=search-input]]:max-w-none [&_[data-slot=search-input]_input]:max-w-none";

export const FORMS_BUILDER_PALETTE_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[var(--workspace-nav-padding-x)] pb-[var(--workspace-nav-padding-y)]";

export const FORMS_BUILDER_PALETTE_ITEM_CLASS = cn(
  WORKSPACE_NAV_ITEM_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  "w-full border-0 bg-transparent text-left",
);

export const FORMS_BUILDER_PALETTE_SECTION_TRIGGER_CLASS = cn(
  WORKSPACE_NAV_SECTION_TRIGGER_CLASS,
  "px-0",
);

export const FORMS_BUILDER_SETTINGS_TABS_CLASS = DRAWER_TYPE_TABS_CLASS;
export const FORMS_BUILDER_SETTINGS_TAB_ACTIVE_CLASS =
  DRAWER_TYPE_TAB_ACTIVE_CLASS;
export const FORMS_BUILDER_SETTINGS_TAB_INACTIVE_CLASS =
  DRAWER_TYPE_TAB_INACTIVE_CLASS;

export const FORMS_BUILDER_CANVAS_SECTION_CLASS = cn(
  "flex h-full min-h-0 flex-col overflow-hidden bg-white",
  SETTINGS_FORM_SURFACE_CLASS,
);

export const FORMS_BUILDER_CANVAS_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[var(--settings-content-padding-x)] py-[var(--settings-content-padding-y)]";

/** Selected canvas field — brand ring, not generic primary. */
export const FORMS_BUILDER_FIELD_CARD_CLASS =
  "flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-card p-5 transition-colors";

export const FORMS_BUILDER_FIELD_CARD_SELECTED_CLASS =
  "border-violet-primary-normal ring-2 ring-violet-primary-normal/30";

export const FORMS_BUILDER_DROP_ACTIVE_CLASS =
  "bg-violet-primary-surface ring-2 ring-violet-primary-normal/30";

export const FORMS_BUILDER_EMPTY_CLASS =
  "flex min-h-[280px] flex-col items-center justify-center px-[var(--spacing-6)] py-[var(--spacing-12)] text-center";
