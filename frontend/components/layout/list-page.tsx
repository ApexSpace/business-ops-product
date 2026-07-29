"use client";

import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { LoadingState } from "@/components/data-display/loading-state";
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
  const toolbarSearch = search ?? filters;

  return (
    <PageContainer dense={dense} className={className}>
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
      {children}
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
  return (
    <PageContainer>
      <LoadingState variant="skeleton" rows={4} />
    </PageContainer>
  );
}
