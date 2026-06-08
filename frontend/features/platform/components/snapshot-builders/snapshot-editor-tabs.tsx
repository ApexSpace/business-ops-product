"use client";

import { Button } from "@/components/ui/button";
import type { SnapshotEditorSection } from "@/features/platform/hooks/use-snapshot-editor";
import { cn } from "@/lib/utils";

export const SNAPSHOT_EDITOR_TABS: {
  value: SnapshotEditorSection;
  label: string;
}[] = [
  { value: "overview", label: "Overview" },
  { value: "labels", label: "Labels" },
  { value: "navigation", label: "Navigation" },
  { value: "dashboard", label: "Dashboard" },
  { value: "crm", label: "CRM" },
  { value: "services", label: "Services & Tags" },
  { value: "calendars", label: "Calendars" },
  { value: "chatbots", label: "Chatbots" },
  { value: "emails", label: "Emails" },
  { value: "preview", label: "Preview" },
  { value: "advanced", label: "Advanced" },
];

export interface SnapshotEditorTabsProps {
  value: SnapshotEditorSection;
  onValueChange: (value: SnapshotEditorSection) => void;
  className?: string;
}

export function SnapshotEditorTabs({
  value,
  onValueChange,
  className,
}: SnapshotEditorTabsProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border/70 bg-muted/30 p-1",
        className,
      )}
    >
      <div className="flex min-w-max gap-1 sm:min-w-0 sm:flex-wrap">
        {SNAPSHOT_EDITOR_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={value === tab.value ? "secondary" : "ghost"}
            className="h-8 shrink-0"
            onClick={() => onValueChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
