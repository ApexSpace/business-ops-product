"use client";

import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { SnapshotEditorTopBar } from "@/features/platform/components/snapshot-builders/editor-top-bar";
import { SnapshotEditorSectionContent } from "@/features/platform/components/snapshot-builders/editor-section-content";
import { SnapshotEditorTabs } from "@/features/platform/components/snapshot-builders/snapshot-editor-tabs";
import { PublishValidationModal } from "@/features/platform/components/snapshot-builders/publish-validation-modal";
import {
  SnapshotEditorProvider,
  useSnapshotEditor,
} from "@/features/platform/hooks/use-snapshot-editor";

function SnapshotEditorLayout() {
  const {
    snapshot,
    isLoading,
    overview,
    activeSection,
    setActiveSection,
    status,
    isDirty,
    isSaving,
    isPublishing,
    isMovingToDraft,
    save,
    moveToDraft,
    requestPublish,
    publishValidationOpen,
    setPublishValidationOpen,
    publishValidationItems,
    confirmPublish,
    canManage,
  } = useSnapshotEditor();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!snapshot) return <p>Snapshot not found</p>;

  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] flex-col">
      <SnapshotEditorTopBar
        name={overview.name}
        status={status ?? snapshot.status}
        isDirty={isDirty}
        isSaving={isSaving}
        isPublishing={isPublishing}
        isMovingToDraft={isMovingToDraft}
        canManage={canManage}
        onSave={() => void save()}
        onMoveToDraft={() => void moveToDraft()}
        onPublish={() => requestPublish()}
      />

      <SnapshotEditorTabs
        value={activeSection}
        onValueChange={setActiveSection}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <SnapshotEditorSectionContent section={activeSection} />
      </main>

      <PublishValidationModal
        open={publishValidationOpen}
        onOpenChange={setPublishValidationOpen}
        items={publishValidationItems}
        isPublishing={isPublishing}
        onConfirmPublish={() => void confirmPublish()}
      />
    </PageContainer>
  );
}

export function PlatformSnapshotDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const canManage = useCan(PERMISSIONS["platform.snapshots.manage"]);

  if (!id) return <p>Snapshot not found</p>;

  return (
    <SnapshotEditorProvider snapshotId={id} canManage={canManage}>
      <SnapshotEditorLayout />
    </SnapshotEditorProvider>
  );
}
