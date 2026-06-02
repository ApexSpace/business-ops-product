"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PipelineSettingsPanel } from "@/components/pipelines/pipeline-settings-panel";
import type { Lead, Pipeline } from "@/types/api";

interface PipelineSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline | null;
  leads: Lead[];
  canManage: boolean;
  onSuccess: () => void;
  onDeleted?: (deletedId: string) => void;
}

/** Optional sheet wrapper around pipeline settings (prefer Settings → Pipelines page). */
export function PipelineSettingsSheet({
  open,
  onOpenChange,
  pipeline,
  leads,
  canManage,
  onSuccess,
  onDeleted,
}: PipelineSettingsSheetProps) {
  if (!pipeline) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Pipeline settings</SheetTitle>
          <SheetDescription>
            Manage structure for{" "}
            <span className="font-medium text-foreground">{pipeline.name}</span>.
            For full setup, use Settings → Pipelines.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <PipelineSettingsPanel
            pipeline={pipeline}
            leads={leads}
            canManage={canManage}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            onDeleted={(id) => {
              onDeleted?.(id);
              onOpenChange(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
