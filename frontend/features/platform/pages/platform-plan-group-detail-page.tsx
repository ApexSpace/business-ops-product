"use client";

import { useRef, useState, type RefObject } from "react";
import { Copy } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PLAN_GROUP_OVERVIEW_FORM_ID,
  PlanGroupOverviewTab,
} from "@/features/platform/components/plan-groups/plan-group-overview-tab";
import { PlanGroupTiersTab } from "@/features/platform/components/plan-groups/plan-group-tiers-tab";
import type { PlanGroupTiersTabHandle } from "@/features/platform/components/plan-groups/plan-group-tiers-tab";
import { PlanGroupPreviewTab } from "@/features/platform/components/plan-groups/plan-group-preview-tab";
import {
  PLAN_GROUP_STYLE_FORM_ID,
  PlanGroupStyleTab,
} from "@/features/platform/components/plan-groups/plan-group-style-tab";
import {
  PlatformPlanGroupDetailTabs,
  type PlatformPlanGroupDetailTab,
} from "@/features/platform/components/plan-groups/platform-plan-group-detail-tabs";
import { usePlatformPlanGroupDetail } from "@/features/platform/hooks/use-platform-plan-group-detail";

function renderTabContent(
  tab: PlatformPlanGroupDetailTab,
  props: ReturnType<typeof usePlatformPlanGroupDetail>,
  tiersTabRef: RefObject<PlanGroupTiersTabHandle | null>,
  onTiersSavingChange: (isSaving: boolean) => void,
) {
  const { planGroup, tiers, embed, embedLoading, preview, previewLoading, canManage } =
    props;
  if (!planGroup) return null;

  switch (tab) {
    case "overview":
      return (
        <PlanGroupOverviewTab
          planGroup={planGroup}
          tierCount={tiers.length}
          capabilityCount={props.capabilityCount}
          featureCount={props.featureCount}
          canManage={canManage}
          onSave={props.saveOverview}
        />
      );
    case "tiers":
      return (
        <PlanGroupTiersTab
          ref={tiersTabRef}
          planGroupId={planGroup.id}
          tiers={tiers}
          canManage={canManage}
          onSavingChange={onTiersSavingChange}
          designSettings={planGroup.designSettings}
          embed={embed ?? null}
          currency={planGroup.currency}
          billingCycles={planGroup.billingCycles}
          defaultCtaLabel={planGroup.defaultCtaLabel}
          defaultCtaUrl={planGroup.defaultCtaUrl}
          snapshotId={planGroup.snapshotId}
        />
      );
    case "style":
      if (embedLoading || !embed) {
        return <Skeleton className="h-64 w-full" />;
      }
      return (
        <PlanGroupStyleTab
          planGroup={planGroup}
          tiers={tiers}
          embed={embed}
          canManage={canManage}
          onSave={props.saveStyle}
        />
      );
    case "preview":
      return (
        <PlanGroupPreviewTab preview={preview} isLoading={previewLoading} />
      );
    default:
      return null;
  }
}

export function PlatformPlanGroupDetailPage() {
  const detail = usePlatformPlanGroupDetail();
  const tiersTabRef = useRef<PlanGroupTiersTabHandle>(null);
  const [tiersSaving, setTiersSaving] = useState(false);
  const {
    planGroup,
    isLoading,
    canManage,
    activeTab,
    setActiveTab,
    deleteOpen,
    setDeleteOpen,
    deleteMutation,
    publishMutation,
    draftMutation,
    copyEmbedCode,
    isSaving,
  } = detail;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!planGroup) return <p>Plan group not found</p>;

  const showPublish = planGroup.status === "DRAFT";
  const showMoveToDraft = planGroup.status === "PUBLISHED";
  const headerSaving = isSaving || tiersSaving;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page-title">{planGroup.name}</h1>
            <StatusBadge status={planGroup.status} domain="planGroup" />
          </div>
        }
        description={planGroup.description ?? undefined}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {activeTab === "overview" ? (
                <ActionButton
                  type="submit"
                  form={PLAN_GROUP_OVERVIEW_FORM_ID}
                  disabled={headerSaving}
                >
                  {headerSaving ? "Saving…" : "Save"}
                </ActionButton>
              ) : null}
              {activeTab === "tiers" ? (
                <ActionButton
                  type="button"
                  disabled={headerSaving}
                  onClick={() => void tiersTabRef.current?.saveAll()}
                >
                  {headerSaving ? "Saving…" : "Save"}
                </ActionButton>
              ) : null}
              {activeTab === "style" ? (
                <ActionButton
                  type="submit"
                  form={PLAN_GROUP_STYLE_FORM_ID}
                  disabled={headerSaving}
                >
                  {headerSaving ? "Saving…" : "Save"}
                </ActionButton>
              ) : null}
              <Button type="button" variant="outline" onClick={() => void copyEmbedCode()}>
                <Copy className="mr-2 size-4" />
                Copy embed code
              </Button>
              {showPublish ? (
                <Button
                  type="button"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                >
                  Publish
                </Button>
              ) : null}
              {showMoveToDraft ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => draftMutation.mutate()}
                  disabled={draftMutation.isPending}
                >
                  Move to Draft
                </Button>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      />

      <PlatformPlanGroupDetailTabs
        value={activeTab}
        onValueChange={setActiveTab}
      />

      {renderTabContent(activeTab, detail, tiersTabRef, setTiersSaving)}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete plan group?"
        description={
          <>
            Permanently delete <strong>{planGroup.name}</strong>? This will
            remove the plan group, tiers, feature rows, and embed settings. This
            action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
