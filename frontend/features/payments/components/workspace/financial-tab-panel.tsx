"use client";

import { ListToolbar } from "@/components/layout/list-toolbar";
import { cn } from "@/lib/utils";

export interface FinancialTabPanelProps {
  actions?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  pagination?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Compact list layout for tabs inside the Payments workspace (no page title). */
export function FinancialTabPanel({
  actions,
  search,
  filters,
  pagination,
  children,
  className,
}: FinancialTabPanelProps) {
  return (
    <div className={cn("flex flex-col gap-[var(--page-stack-gap)]", className)}>
      <ListToolbar search={search} filters={filters} actions={actions} />
      {children}
      {pagination}
    </div>
  );
}
