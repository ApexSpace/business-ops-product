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

/** Flush toolbar above Figma table — no card chrome */
export const WORKSPACE_TOOLBAR_CLASS =
  "rounded-none border-0 bg-transparent px-0 py-3 shadow-none sm:px-0";

export const WORKSPACE_TOOLBAR_SURFACE_CLASS =
  "flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--drawer-tab-track)] bg-white p-2 sm:p-3";

/**
 * Applied on DataTable — keep empty so DATA_TABLE_SHELL_CLASS
 * (radius/md + primary/200 border) is not overridden.
 */
export const WORKSPACE_TABLE_CLASS = "shadow-none";

/** Workspace list surface — page white; table supplies its own border chrome */
export const WORKSPACE_TABLE_CARD_CLASS =
  "flex min-h-0 flex-col overflow-hidden rounded-none border-0 bg-white shadow-none";

export const ENTITY_DRAWER_TOOLBAR_CLASS =
  "shrink-0 border-b border-border/70 bg-background px-6 py-3";

export const ENTITY_DRAWER_SUMMARY_CLASS =
  "shrink-0 border-b border-border/70 bg-background px-6 py-3";

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
