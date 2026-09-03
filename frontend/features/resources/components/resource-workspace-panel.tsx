"use client";

import { useMemo, useState } from "react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EntityDetailTabs } from "@/components/layout/entity-detail-tabs";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResourceDetailsSection } from "@/features/resources/components/resource-details-section";
import { ResourceScheduleSection } from "@/features/resources/components/resource-schedule-section";
import { ResourceServicesSection } from "@/features/resources/components/resource-services-section";
import { useResourceGroups } from "@/features/resources/hooks/use-resource-groups";
import { useResourceMutations } from "@/features/resources/hooks/use-resource-mutations";
import { useResourceWorkspace } from "@/features/resources/hooks/use-resource-workspace";
import type {
  DayOfWeek,
  ResourceAvailabilitySlot,
} from "@/features/resources/types";
import { SETTINGS_CONTENT_SHELL_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

type ResourceWorkspacePanelProps = {
  resourceId: string;
  onDeleted?: () => void;
};

export function ResourceWorkspacePanel({
  resourceId,
  onDeleted,
}: ResourceWorkspacePanelProps) {
  const { data, isLoading, isError, error, refetch } =
    useResourceWorkspace(resourceId);
  const { data: groups } = useResourceGroups();
  const mutations = useResourceMutations();
  const [tab, setTab] = useState("details");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tabs = useMemo(
    () => [
      { value: "details", label: "Details" },
      { value: "schedule", label: "Schedule" },
      { value: "services", label: "Services" },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading resource…</div>
    );
  }

  if (isError || !data) {
    return (
      <ApiErrorState
        className="m-6"
        error={error}
        title="Could not load resource"
        onRetry={() => void refetch()}
      />
    );
  }

  const { resource } = data;
  const title = resource.groupName
    ? `${resource.groupName} | ${resource.name}`
    : resource.name;

  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, "max-w-4xl")}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="truncate text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<MoreActionsButton aria-label="Resource actions" />}
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Delete resource
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EntityDetailTabs
        variant="panel"
        value={tab}
        onValueChange={setTab}
        tabs={tabs}
        aria-label="Resource sections"
        className="-mx-[var(--settings-content-padding-x)]"
      />

      <div className="min-w-0">
        {tab === "details" ? (
          <ResourceDetailsSection
            resource={resource}
            groups={groups ?? []}
            isSaving={mutations.update.isPending}
            onSave={async (body) => {
              await mutations.update.mutateAsync({ id: resourceId, body });
            }}
          />
        ) : null}

        {tab === "schedule" ? (
          <ResourceScheduleSection
            resourceId={resourceId}
            alwaysAvailable={resource.alwaysAvailable ?? false}
            availability={data.availability}
            scheduleExceptions={data.scheduleExceptions}
            isSavingAvailability={mutations.saveAvailability.isPending}
            isSavingAlwaysAvailable={mutations.update.isPending}
            onSaveAlwaysAvailable={async (alwaysAvailable) => {
              await mutations.update.mutateAsync({
                id: resourceId,
                body: { alwaysAvailable },
              });
            }}
            onSaveDay={async (
              _day: DayOfWeek,
              slots: ResourceAvailabilitySlot[],
            ) => {
              await mutations.saveAvailability.mutateAsync({
                resourceId,
                slots: slots.map((slot) => ({
                  dayOfWeek: slot.dayOfWeek,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  isEnabled: slot.isEnabled,
                })),
              });
            }}
            onAddException={async (body) => {
              await mutations.addScheduleException.mutateAsync({
                resourceId,
                body,
              });
            }}
            onRemoveException={(exceptionId) => {
              mutations.removeScheduleException.mutate({
                resourceId,
                exceptionId,
              });
            }}
          />
        ) : null}

        {tab === "services" ? (
          <ResourceServicesSection linkedServices={data.linkedServices} />
        ) : null}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Resources linked to services must be
              unlinked first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                mutations.remove.mutate(resourceId, {
                  onSuccess: () => {
                    setConfirmDelete(false);
                    onDeleted?.();
                  },
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
