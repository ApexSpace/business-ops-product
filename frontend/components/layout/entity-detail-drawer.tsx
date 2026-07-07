"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
} from "@/components/ui/sheet";
import { LoadingState } from "@/components/data-display/loading-state";
import { cn } from "@/lib/utils";
import {
  ENTITY_DRAWER_BODY_CLASS,
  ENTITY_DRAWER_CONTENT_INSET_CLASS,
  ENTITY_DRAWER_FOOTER_CLASS,
  ENTITY_DRAWER_TOOLBAR_CLASS,
  entityDrawerWidthClass,
  type EntityDrawerWidthTier,
} from "@/lib/design/workspace-tokens";
import { EntityDetailHeader } from "./entity-detail-header";
import { EntityDetailTabs, type EntityDetailTabItem } from "./entity-detail-tabs";

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
  /** Full-bleed body (e.g. split contacts layout manages its own column padding). */
  fullBleed?: boolean;
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
  fullBleed = false,
}: EntityDetailDrawerProps) {
  const widthClass = entityDrawerWidthClass(resolveWidth(width));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          "flex h-full max-h-svh flex-col gap-0 p-0",
          widthClass,
          className,
        )}
      >
        <EntityDetailHeader
          title={title}
          subtitle={subtitle}
          badges={badges}
          actions={headerActions}
          overflowActions={overflowActions}
        />

        {tabs && tabs.length > 1 && activeTab && onTabChange ? (
          <EntityDetailTabs
            value={activeTab}
            onValueChange={onTabChange}
            tabs={tabs}
          />
        ) : null}

        {summary ? <div className="shrink-0">{summary}</div> : null}

        {toolbar ? (
          <div className={ENTITY_DRAWER_TOOLBAR_CLASS}>{toolbar}</div>
        ) : null}

        <SheetBody
          className={cn(ENTITY_DRAWER_BODY_CLASS, "!p-0", bodyClassName)}
        >
          {isLoading ? (
            <div
              className={cn(
                !fullBleed && ENTITY_DRAWER_CONTENT_INSET_CLASS,
                contentClassName,
              )}
            >
              <LoadingState variant="skeleton" rows={4} />
            </div>
          ) : fullBleed ? (
            children
          ) : (
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col gap-3",
                ENTITY_DRAWER_CONTENT_INSET_CLASS,
                contentClassName,
              )}
            >
              {children}
            </div>
          )}
        </SheetBody>

        {footer ? (
          <footer className={ENTITY_DRAWER_FOOTER_CLASS}>{footer}</footer>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
