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
  ENTITY_DRAWER_FOOTER_CLASS,
  ENTITY_DRAWER_WIDTH_DEFAULT,
  ENTITY_DRAWER_WIDTH_WIDE,
} from "@/lib/design/workspace-tokens";
import { EntityDetailHeader } from "./entity-detail-header";
import { EntityDetailTabs, type EntityDetailTabItem } from "./entity-detail-tabs";

export type EntityDetailDrawerWidth = "default" | "wide";

interface EntityDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  headerActions?: React.ReactNode;
  overflowActions?: React.ComponentProps<
    typeof EntityDetailHeader
  >["overflowActions"];
  tabs?: EntityDetailTabItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  footer?: React.ReactNode;
  width?: EntityDetailDrawerWidth;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
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
  footer,
  width = "default",
  isLoading = false,
  children,
  className,
}: EntityDetailDrawerProps) {
  const widthClass =
    width === "wide" ? ENTITY_DRAWER_WIDTH_WIDE : ENTITY_DRAWER_WIDTH_DEFAULT;

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

        <SheetBody className={cn(ENTITY_DRAWER_BODY_CLASS, "flex flex-col gap-4")}>
          {isLoading ? (
            <LoadingState variant="skeleton" rows={4} />
          ) : (
            children
          )}
        </SheetBody>

        {footer ? (
          <footer className={ENTITY_DRAWER_FOOTER_CLASS}>{footer}</footer>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
