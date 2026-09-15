"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  PageTabs,
  PageTabsPanel,
  type PageTabItem,
} from "@/components/layout/page-tabs";
import { cn } from "@/lib/utils";

export interface TabbedWorkspaceLayoutProps {
  title: string;
  description?: string;
  value: string;
  onValueChange: (value: string) => void;
  tabs: PageTabItem[];
  children: React.ReactNode;
  className?: string;
  listClassName?: string;
  triggerClassName?: string;
  onTabHover?: (value: string) => void;
  /** When true, render children only (e.g. mobile full-bleed tab). */
  bypassChrome?: boolean;
}

/**
 * PageContainer + PageHeader + PageTabs workspace shell.
 * Prefer this over re-assembling the same chrome in each feature.
 */
export function TabbedWorkspaceLayout({
  title,
  description,
  value,
  onValueChange,
  tabs,
  children,
  className,
  listClassName,
  triggerClassName,
  onTabHover,
  bypassChrome = false,
}: TabbedWorkspaceLayoutProps) {
  if (bypassChrome) {
    return (
      <div className={cn("flex h-full min-h-0 flex-1 flex-col bg-white", className)}>
        {children}
      </div>
    );
  }

  return (
    <PageContainer
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <PageHeader title={title} description={description} />
      <PageTabs
        value={value}
        onValueChange={onValueChange}
        tabs={tabs}
        listClassName={listClassName}
        triggerClassName={triggerClassName}
        onTabHover={onTabHover}
        className="flex min-h-0 flex-1 flex-col gap-[var(--page-stack-gap)]"
      >
        {children}
      </PageTabs>
    </PageContainer>
  );
}

export { PageTabsPanel };
