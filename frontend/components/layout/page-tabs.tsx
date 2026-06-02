"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface PageTabItem {
  value: string;
  label: React.ReactNode;
}

export interface PageTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: PageTabItem[];
  children: React.ReactNode;
  className?: string;
  listClassName?: string;
  triggerClassName?: string;
}

export function PageTabs({
  value,
  onValueChange,
  tabs,
  children,
  className,
  listClassName,
  triggerClassName,
}: PageTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <PageTabsList
        tabs={tabs}
        className={listClassName}
        triggerClassName={triggerClassName}
      />
      {children}
    </Tabs>
  );
}

export interface PageTabsListProps {
  tabs: PageTabItem[];
  className?: string;
  triggerClassName?: string;
}

export function PageTabsList({
  tabs,
  className,
  triggerClassName,
}: PageTabsListProps) {
  return (
    <TabsList
      className={cn(
        "flex h-auto w-full flex-wrap justify-start gap-1",
        className,
      )}
    >
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className={cn("text-xs sm:text-sm", triggerClassName)}
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

export interface PageTabsPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function PageTabsPanel({
  value,
  children,
  className,
}: PageTabsPanelProps) {
  return (
    <TabsContent
      value={value}
      className={cn("mt-6 space-y-4 outline-none", className)}
    >
      {children}
    </TabsContent>
  );
}
