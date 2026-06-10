"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/data-display/status-badge";
import {
  CAPABILITY_OVERVIEW_FORM_ID,
  CapabilityOverviewTab,
} from "@/features/platform/components/capabilities/capability-overview-tab";
import { CapabilityModulesTab } from "@/features/platform/components/capabilities/capability-modules-tab";
import {
  PlatformCapabilityDetailTabs,
  type PlatformCapabilityDetailTab,
} from "@/features/platform/components/capabilities/platform-capability-detail-tabs";
import { usePlatformCapabilityDetail } from "@/features/platform/hooks/use-platform-capability-detail";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function renderTabContent(
  tab: PlatformCapabilityDetailTab,
  props: ReturnType<typeof usePlatformCapabilityDetail>,
) {
  const { id, capability, canManage } = props;
  if (!capability) return null;

  switch (tab) {
    case "overview":
      return (
        <CapabilityOverviewTab
          capability={capability}
          canManage={canManage}
          onSave={props.saveOverview}
        />
      );
    case "modules":
      return (
        <CapabilityModulesTab
          canManage={canManage}
          catalog={props.moduleCatalog}
          moduleSelections={props.effectiveModuleSelections}
          isDirty={props.isModulesDirty}
          isAssignedLoading={props.isAssignedModulesLoading}
          onToggleModuleMaster={props.toggleModuleMaster}
          onToggleModuleOption={props.toggleModuleOption}
          onReset={props.resetModuleSelection}
        />
      );
    default:
      return null;
  }
}

export function PlatformCapabilityDetailPage() {
  const detail = usePlatformCapabilityDetail();
  const {
    capability,
    isLoading,
    canManage,
    activeTab,
    setActiveTab,
    deleteOpen,
    setDeleteOpen,
    deleteMutation,
    publishMutation,
    draftMutation,
    isSaving,
    isModulesDirty,
    saveModules,
  } = detail;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!capability) return <p>Capability not found</p>;

  const showPublish = capability.status === "DRAFT";
  const showMoveToDraft = capability.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page-title">{capability.name}</h1>
            <StatusBadge status={capability.status} domain="capability" />
          </div>
        }
        description={capability.description ?? undefined}
        actions={
          canManage ? (
            <>
              {activeTab === "overview" ? (
                <ActionButton
                  type="submit"
                  form={CAPABILITY_OVERVIEW_FORM_ID}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Save Capability"}
                </ActionButton>
              ) : (
                <ActionButton
                  type="button"
                  disabled={isSaving || !isModulesDirty}
                  onClick={() => saveModules()}
                >
                  {isSaving ? "Saving…" : "Save Capability"}
                </ActionButton>
              )}
              {showPublish ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                >
                  {publishMutation.isPending ? "Publishing…" : "Publish"}
                </Button>
              ) : null}
              {showMoveToDraft ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => draftMutation.mutate()}
                  disabled={draftMutation.isPending}
                >
                  {draftMutation.isPending ? "Moving…" : "Move to Draft"}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </>
          ) : null
        }
      />

      <PlatformCapabilityDetailTabs
        value={activeTab}
        onValueChange={setActiveTab}
      />

      <div className="min-h-[320px]">
        {renderTabContent(activeTab, detail)}
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete capability permanently?"
        description={
          <>
            Permanently delete <strong>{capability.name}</strong> and all
            related module and feature assignments? This cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
