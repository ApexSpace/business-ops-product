/**
 * Design-token ownership
 * - Visual values: frontend/app/globals.css and frontend/lib/theme/*
 * - This file: workspace / list-surface recipes and drawer layout contracts only
 * - Features must not introduce new raw color / radius / height values
 *
 * Drawer widths live in `drawer-tokens` (`drawerShellWidthClass`). Do not add a
 * parallel width map here.
 */

import type { CSSProperties } from "react";
import type { DrawerShellWidthTier } from "@/lib/design/drawer-tokens";

/** Shared workspace and entity drawer recipes. */
export const WORKSPACE_ACTIVE_ROW_CLASS =
  "shadow-[inset_3px_0_0_0_var(--pc-violet-primary-normal)]";

/**
 * Flush toolbar above the Figma table — no card chrome.
 * Vertical rhythm is `--cs-list-toolbar-gap` on the workspace card (equal
 * above and below the toolbar). Do not add extra py here or the shell
 * `--page-content-top-gap` stacks and the top gap looks larger.
 */
export const WORKSPACE_TOOLBAR_CLASS =
  "rounded-none border-0 bg-transparent px-0 py-0 shadow-none sm:px-0";

export const WORKSPACE_TOOLBAR_SURFACE_CLASS =
  "flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--drawer-tab-track)] bg-white p-2 sm:p-3";

/**
 * Applied on DataTable — keep empty so DATA_TABLE_SHELL_CLASS
 * (radius/md + primary/200 border) is not overridden.
 */
export const WORKSPACE_TABLE_CLASS = "shadow-none";

/** Full-height workspace column — parent must also be a flex fill chain. */
export const WORKSPACE_FILL_CLASS =
  "flex h-full min-h-0 flex-1 flex-col overflow-hidden";

/** Workspace list surface — page white; table supplies its own border chrome */
export const WORKSPACE_TABLE_CARD_CLASS =
  "flex min-h-0 flex-1 flex-col gap-[var(--cs-list-toolbar-gap)] overflow-hidden rounded-none border-0 bg-white shadow-none";

/** Pagination / footer strip under the table — tight so the grid can grow */
export const WORKSPACE_FOOTER_CLASS =
  "shrink-0 border-t border-[var(--drawer-header-border)] bg-white px-4 py-2";

export const ENTITY_DRAWER_TOOLBAR_CLASS =
  "shrink-0 border-b border-border/70 bg-background px-6 py-3";

export const ENTITY_DRAWER_SUMMARY_CLASS =
  "shrink-0 border-b border-border/70 bg-background px-6 py-3";

/**
 * Discrete filter pills (Figma Client Details timeline).
 * Height 30px / radius-sm / px 16 / py 6 / gap 8 — values already used
 * by contacts timeline chips; promoted here for shared reuse.
 */
export const ENTITY_FILTER_PILL_ROW_CLASS =
  "flex w-full min-w-0 flex-wrap items-center justify-center gap-2";

export const ENTITY_FILTER_PILL_CLASS =
  "relative box-border inline-flex h-[30px] max-h-[30px] min-h-[30px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--mobile-list-border)] bg-white px-4 py-1.5 text-[12px] font-medium leading-none text-[var(--drawer-text-primary)] shadow-none transition-colors duration-150 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] hover:bg-violet-primary-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/25";

export const ENTITY_FILTER_PILL_ACTIVE_CLASS =
  "relative box-border inline-flex h-[30px] max-h-[30px] min-h-[30px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] border border-violet-primary-normal bg-violet-primary-normal px-4 py-1.5 text-[12px] font-semibold leading-none text-white shadow-none transition-colors duration-150 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] hover:bg-violet-primary-normal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/25";

/** CSS custom properties for workspace shells (set on layout root when needed). */
export const WORKSPACE_CSS_VARS = {
  "--workspace-toolbar-height": "3rem",
  "--drawer-width-default": "480px",
  "--drawer-width-standard": "600px",
  "--drawer-width-wide": "640px",
  "--drawer-width-split": "1120px",
  "--entity-drawer-toolbar-z": "10",
} as Record<string, string> as CSSProperties;

export type EntityDrawerWidthTier = Extract<
  DrawerShellWidthTier,
  "compact" | "standard" | "wide" | "split" | "conversation"
>;
