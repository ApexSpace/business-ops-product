"use client";

import { LoadingState } from "@/components/data-display/loading-state";
import {
  DrawerShell,
  type DrawerShellChrome,
} from "@/components/layout/drawer-shell";
import { EntityDetailHeader } from "@/components/layout/entity-detail-header";
import {
  EntityDetailTabs,
  type EntityDetailTabItem,
} from "@/components/layout/entity-detail-tabs";
import { DRAWER_SHELL_CONTENT_INSET_CLASS } from "@/lib/design/drawer-tokens";
import {
  ENTITY_DRAWER_SUMMARY_CLASS,
  ENTITY_DRAWER_TOOLBAR_CLASS,
  type EntityDrawerWidthTier,
} from "@/lib/design/workspace-tokens";
import { cn } from "@/lib/utils";

/** @deprecated Use `compact` instead */
type LegacyDrawerWidth = "default";

export type EntityDetailDrawerWidth =
  | EntityDrawerWidthTier
  | LegacyDrawerWidth;

interface EntityDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  headerActions?: React.ReactNode;
  overflowActions?: React.ComponentProps<
    typeof EntityDetailHeader
  >["overflowActions"];
  tabs?: EntityDetailTabItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  summary?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  width?: EntityDetailDrawerWidth;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  /** @deprecated Spine title chrome comes from DrawerShell. */
  titleClassName?: string;
  /** Full-bleed body (e.g. split contacts layout manages its own column padding). */
  fullBleed?: boolean;
  /** Vertical purpose strip (e.g. “CLIENT DETAILS”). Hidden on mobile-brand chrome. */
  spineLabel?: string;
  chrome?: DrawerShellChrome;
  /** Higher z-index when opened over another sheet (e.g. Conversations inbox). */
  stackLevel?: "base" | "overlay";
}

function resolveWidth(width: EntityDetailDrawerWidth): EntityDrawerWidthTier {
  if (width === "default") {
    return "compact";
  }
  return width;
}

export function EntityDetailDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  badges,
  headerActions,
  overflowActions,
  tabs,
  activeTab,
  onTabChange,
  summary,
  toolbar,
  footer,
  width = "compact",
  isLoading = false,
  children,
  className,
  bodyClassName,
  contentClassName,
  headerClassName,
  fullBleed = false,
  spineLabel,
  chrome = "default",
  stackLevel = "base",
}: EntityDetailDrawerProps) {
  const resolvedWidth = resolveWidth(width);
  const headerCluster = (
    <>
      {badges}
      <EntityDetailHeader
        actions={headerActions}
        overflowActions={overflowActions}
        tone={chrome === "mobile-brand" ? "on-brand" : "default"}
      />
    </>
  );

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width={resolvedWidth}
      chrome={chrome}
      stackLevel={stackLevel}
      spineLabel={spineLabel}
      title={title}
      description={subtitle}
      headerActions={headerCluster}
      footer={footer}
      className={className}
      headerClassName={headerClassName}
      bodyClassName={cn(
        fullBleed && "flex flex-col overflow-hidden",
        bodyClassName,
      )}
      contentClassName={cn(
        "flex min-h-0 flex-1 flex-col !px-0 !py-0 space-y-0",
        contentClassName,
      )}
    >
      {tabs && tabs.length > 1 && activeTab && onTabChange ? (
        <EntityDetailTabs
          value={activeTab}
          onValueChange={onTabChange}
          tabs={tabs}
        />
      ) : null}

      {summary ? (
        <div className={ENTITY_DRAWER_SUMMARY_CLASS}>{summary}</div>
      ) : null}

      {toolbar ? (
        <div className={ENTITY_DRAWER_TOOLBAR_CLASS}>{toolbar}</div>
      ) : null}

      {isLoading ? (
        <div className={cn(!fullBleed && DRAWER_SHELL_CONTENT_INSET_CLASS)}>
          <LoadingState variant="skeleton" rows={4} />
        </div>
      ) : fullBleed ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-3",
            DRAWER_SHELL_CONTENT_INSET_CLASS,
          )}
        >
          {children}
        </div>
      )}
    </DrawerShell>
  );
}
