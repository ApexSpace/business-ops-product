/** Shared workspace and entity drawer design tokens. */
export const WORKSPACE_ACTIVE_ROW_CLASS =
  "shadow-[inset_3px_0_0_0_var(--color-primary)]";

export const WORKSPACE_TABLE_ROW_HOVER_CLASS = "hover:bg-muted/50";

export const WORKSPACE_TOOLBAR_CLASS =
  "rounded-none border-0 border-b bg-transparent p-3 shadow-none sm:px-4";

export const WORKSPACE_TOOLBAR_SURFACE_CLASS =
  "flex flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:p-3 shadow-elevation-xs";

export const WORKSPACE_TABLE_CLASS = "rounded-none border-0 shadow-none";

export const WORKSPACE_TABLE_CARD_CLASS =
  "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs";

export const ENTITY_DRAWER_WIDTH_DEFAULT =
  "[--sheet-width:min(92vw,480px)]";

export const ENTITY_DRAWER_WIDTH_WIDE = "[--sheet-width:min(92vw,640px)]";

export const ENTITY_DRAWER_HEADER_CLASS =
  "shrink-0 border-b border-border/70 px-6 py-5 pr-14";

export const ENTITY_DRAWER_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto px-6 py-5";

export const ENTITY_DRAWER_FOOTER_CLASS =
  "shrink-0 border-t border-border/70 bg-background px-6 py-4";

/** CSS custom properties for workspace shells (set on layout root when needed). */
export const WORKSPACE_CSS_VARS = {
  "--workspace-toolbar-height": "3rem",
  "--drawer-width-default": "480px",
  "--drawer-width-wide": "640px",
} as const;
