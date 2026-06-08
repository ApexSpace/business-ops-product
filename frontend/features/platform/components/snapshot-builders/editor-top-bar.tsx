"use client";

import { Button } from "@/components/ui/button";
import type { SnapshotStatus } from "@/features/platform/types/snapshot";

interface SnapshotEditorTopBarProps {
  name: string;
  status: SnapshotStatus;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isMovingToDraft: boolean;
  canManage: boolean;
  onSave: () => void;
  onMoveToDraft: () => void;
  onPublish: () => void;
}

export function SnapshotEditorTopBar({
  name,
  status,
  isDirty,
  isSaving,
  isPublishing,
  isMovingToDraft,
  canManage,
  onSave,
  onMoveToDraft,
  onPublish,
}: SnapshotEditorTopBarProps) {
  const isDraft = status === "DRAFT";
  const isPublished = status === "PUBLISHED";
  const controlsBusy = isSaving || isPublishing || isMovingToDraft;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <h1 className="truncate text-lg font-semibold">{name || "Untitled snapshot"}</h1>
        <p className="text-sm text-muted-foreground">
          Configure how businesses experience navigation, labels, and defaults.
        </p>
      </div>
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          {isPublished ? (
            <Button
              type="button"
              disabled={!isDirty || controlsBusy}
              onClick={onSave}
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || controlsBusy}
              onClick={onSave}
            >
              {isSaving ? "Saving…" : "Save as Draft"}
            </Button>
          )}

          {isPublished ? (
            <Button
              type="button"
              variant="outline"
              disabled={controlsBusy}
              onClick={onMoveToDraft}
            >
              {isMovingToDraft ? "Moving…" : "Move to draft"}
            </Button>
          ) : null}

          {isDraft ? (
            <Button
              type="button"
              disabled={controlsBusy}
              onClick={onPublish}
            >
              {isPublishing ? "Publishing…" : "Publish"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
