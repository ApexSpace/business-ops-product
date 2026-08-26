"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_FILL_CLASS,
  WORKSPACE_FOOTER_CLASS,
  WORKSPACE_TABLE_BODY_CLASS,
  WORKSPACE_TABLE_CARD_CLASS,
  WORKSPACE_TOOLBAR_CLASS,
} from "@/lib/design/workspace-tokens";

export interface EntityWorkspaceLayoutProps {
  title: string;
  description?: string;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  /** Full custom toolbar — when set, search/filters/actions are ignored. */
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional detail/create drawer rendered beside the workspace card. */
  drawer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
  fullHeight?: boolean;
  /** Hide the page header when the shell already provides chrome (e.g. mobile). */
  hideHeader?: boolean;
}

/**
 * Standard entity list workspace:
 * PageHeader → table card (toolbar + content + footer) + optional drawer slot.
 */
export function EntityWorkspaceLayout({
  title,
  description,
  search,
  filters,
  actions,
  toolbar,
  footer,
  drawer,
  children,
  className,
  dense = true,
  fullHeight = true,
  hideHeader = false,
}: EntityWorkspaceLayoutProps) {
  const toolbarNode =
    toolbar ??
    (search || filters || actions ? (
      <ListToolbar
        className={WORKSPACE_TOOLBAR_CLASS}
        search={search}
        filters={filters}
        actions={actions}
      />
    ) : null);

  return (
    <PageContainer
      dense={dense}
      fullHeight={fullHeight}
      className={cn(fullHeight && WORKSPACE_FILL_CLASS, className)}
    >
      {hideHeader ? null : (
        <PageHeader title={title} description={description} />
      )}
      <section className={WORKSPACE_TABLE_CARD_CLASS}>
        {toolbarNode}
        <div className={WORKSPACE_TABLE_BODY_CLASS}>{children}</div>
        {footer ? <div className={WORKSPACE_FOOTER_CLASS}>{footer}</div> : null}
      </section>
      {drawer}
    </PageContainer>
  );
}
