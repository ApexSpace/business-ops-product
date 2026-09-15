"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { LoadingState } from "@/components/data-display/loading-state";
import { isAppsMasterDetailWorkspacePath } from "@/components/shell/shell-full-bleed-paths";
import {
  APPS_MASTER_DETAIL_CANVAS_SLOT_CLASS,
  WORKSPACE_FILL_CLASS,
} from "@/lib/design/workspace-tokens";
import { cn } from "@/lib/utils";

export interface ListPageProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  search?: React.ReactNode;
  /** Replaces the default ListToolbar when a page needs custom responsive toolbar layout. */
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
}

function ListPageContent({
  title,
  description,
  actions,
  filters,
  search,
  toolbar,
  pagination,
  children,
  className,
  dense,
}: ListPageProps) {
  const pathname = usePathname();
  const masterDetail = isAppsMasterDetailWorkspacePath(pathname);
  const toolbarSearch = search ?? filters;

  return (
    <PageContainer
      dense={dense}
      fullHeight={masterDetail}
      className={cn(masterDetail && WORKSPACE_FILL_CLASS, className)}
    >
      <PageHeader title={title} description={description} />
      {toolbar ? (
        toolbar
      ) : toolbarSearch || actions ? (
        <ListToolbar
          search={toolbarSearch}
          filters={search ? filters : undefined}
          actions={actions}
        />
      ) : null}
      {masterDetail ? (
        <div className={APPS_MASTER_DETAIL_CANVAS_SLOT_CLASS}>{children}</div>
      ) : (
        children
      )}
      {pagination}
    </PageContainer>
  );
}

export function ListPage(props: ListPageProps) {
  return <ListPageContent {...props} />;
}

export function ListPageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ListPageSkeleton />}>{children}</Suspense>
  );
}

export function ListPageSkeleton() {
  const pathname = usePathname();
  const masterDetail = isAppsMasterDetailWorkspacePath(pathname);
  return (
    <PageContainer
      fullHeight={masterDetail}
      className={masterDetail ? WORKSPACE_FILL_CLASS : undefined}
    >
      <LoadingState variant="skeleton" rows={4} />
    </PageContainer>
  );
}
