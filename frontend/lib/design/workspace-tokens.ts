import type { CSSProperties } from "react";

/** Shared workspace and entity drawer design tokens. */
export const WORKSPACE_ACTIVE_ROW_CLASS =
  "shadow-[inset_3px_0_0_0_#7E3BED]";

export const WORKSPACE_TABLE_ROW_HOVER_CLASS = "hover:bg-[#F6F1FE]/60";

/** Flush toolbar above Figma table — no card chrome */
export const WORKSPACE_TOOLBAR_CLASS =
  "rounded-none border-0 bg-transparent px-0 py-3 shadow-none sm:px-0";

export const WORKSPACE_TOOLBAR_SURFACE_CLASS =
  "flex flex-col gap-2 rounded-[var(--radius-md)] border border-[#F3F0F9] bg-white p-2 sm:p-3";

/**
 * Applied on DataTable — keep empty so DATA_TABLE_SHELL_CLASS
 * (radius/md + primary/200 border) is not overridden.
 */
export const WORKSPACE_TABLE_CLASS = "shadow-none";

/** Workspace list surface — page white; table supplies its own border chrome */
export const WORKSPACE_TABLE_CARD_CLASS =
  "flex min-h-0 flex-col overflow-hidden rounded-none border-0 bg-white shadow-none";

export const ENTITY_DRAWER_WIDTH_DEFAULT =
  "[--sheet-width:min(92vw,480px)]";

export const ENTITY_DRAWER_WIDTH_STANDARD =
  "[--sheet-width:min(92vw,560px)]";

export const ENTITY_DRAWER_WIDTH_WIDE = "[--sheet-width:min(92vw,640px)]";

/** Two-column entity drawers (e.g. contacts profile + records). */
export const ENTITY_DRAWER_WIDTH_SPLIT = "[--sheet-width:min(94vw,900px)]";

export const ENTITY_DRAWER_TOOLBAR_CLASS =
  "shrink-0 border-b border-border/70 bg-background px-6 py-3";

export const ENTITY_DRAWER_SUMMARY_CLASS =
  "shrink-0 border-b border-border/70 bg-background px-6 py-3";

export const ENTITY_DRAWER_HEADER_CLASS =
  "shrink-0 border-b border-border/70 px-6 py-4 pr-14";

/** Inner inset for drawer body content — matches header/footer horizontal rhythm. */
export const ENTITY_DRAWER_CONTENT_INSET_CLASS = "px-6 py-5";

/** Scrollable drawer body shell (padding on inner content wrapper). */
export const ENTITY_DRAWER_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto";

export const ENTITY_DRAWER_FOOTER_CLASS =
  "shrink-0 border-t border-border/70 bg-background px-6 py-4";

/** CSS custom properties for workspace shells (set on layout root when needed). */
export const WORKSPACE_CSS_VARS = {
  "--workspace-toolbar-height": "3rem",
  "--drawer-width-default": "480px",
  "--drawer-width-standard": "560px",
  "--drawer-width-wide": "640px",
  "--drawer-width-split": "900px",
  "--entity-drawer-toolbar-z": "10",
} as Record<string, string> as CSSProperties;

export type EntityDrawerWidthTier =
  | "compact"
  | "standard"
  | "wide"
  | "split"
  | "conversation";

export const ENTITY_DRAWER_WIDTH_CONVERSATION =
  "[--sheet-width:min(70vw,900px)]";

export const ENTITY_DRAWER_WIDTH_APPOINTMENT =
  "[--sheet-width:min(94vw,600px)]";

export function entityDrawerWidthClass(
  width: EntityDrawerWidthTier = "compact",
): string {
  switch (width) {
    case "split":
      return ENTITY_DRAWER_WIDTH_SPLIT;
    case "conversation":
      return ENTITY_DRAWER_WIDTH_CONVERSATION;
    case "wide":
      return ENTITY_DRAWER_WIDTH_WIDE;
    case "standard":
      return ENTITY_DRAWER_WIDTH_STANDARD;
    default:
      return ENTITY_DRAWER_WIDTH_DEFAULT;
  }
}
