"use client";

import { DataToolbar } from "@/components/layout/data-toolbar";
import { cn } from "@/lib/utils";

export interface FinancialTabPanelProps {
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  pagination?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Compact list layout for tabs inside the Payments workspace (no page title). */
export function FinancialTabPanel({
  actions,
  filters,
  pagination,
  children,
  className,
}: FinancialTabPanelProps) {
  return (
    <div className={cn("flex flex-col gap-[var(--page-stack-gap)]", className)}>
      {filters || actions ? (
        <DataToolbar filters={filters} actions={actions} />
      ) : null}
      {children}
      {pagination}
    </div>
  );
}
