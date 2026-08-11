"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_TABLE_CARD_CLASS,
  WORKSPACE_TOOLBAR_CLASS,
} from "@/lib/design/workspace-tokens";

export interface EntityWorkspaceLayoutProps {
  title: string;
  description?: string;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
  fullHeight?: boolean;
}

export function EntityWorkspaceLayout({
  title,
  description,
  search,
  filters,
  actions,
  toolbar,
  footer,
  children,
  className,
  dense = true,
  fullHeight = true,
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
      className={cn(
        fullHeight && "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      <PageHeader title={title} description={description} />
      <section className={cn(WORKSPACE_TABLE_CARD_CLASS, "min-h-0 flex-1")}>
        {toolbarNode}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[#BC9BF6] bg-white px-4 py-3 text-sm text-grey-tertiary-normal">
            {footer}
          </div>
        ) : null}
      </section>
    </PageContainer>
  );
}
