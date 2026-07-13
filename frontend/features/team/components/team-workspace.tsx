"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { ListPageSkeleton } from "@/components/layout/list-page";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { AddStaffMemberDialog } from "@/features/settings/components/add-staff-member-dialog";
import {
  archiveStaffMember,
  listBusinessMembers,
} from "@/features/settings/api/business.api";
import { getTeamMember } from "@/features/team/api/team.api";
import { TeamMemberList } from "@/features/team/components/team-member-list";
import { TeamMemberTabs } from "@/features/team/components/team-member-tabs";
import { MemberDetailsTab } from "@/features/team/components/tabs/member-details-tab";
import { MemberNotificationsTab } from "@/features/team/components/tabs/member-notifications-tab";
import { MemberPermissionsTab } from "@/features/team/components/tabs/member-permissions-tab";
import { MemberServicesTab } from "@/features/team/components/tabs/member-services-tab";
import { MemberWorkHoursTab } from "@/features/team/components/tabs/member-work-hours-tab";
import { MemberCompensationTab } from "@/features/team/components/tabs/member-compensation-tab";
import {
  isTeamMemberTab,
  type TeamMemberTabId,
} from "@/features/team/constants/team-member-tabs";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { useAuth } from "@/lib/auth/provider";

const TEAM_LIST_LIMIT = 100;

function TeamWorkspaceContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = useCan(PERMISSIONS["members.invite"]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const { selectedId, tab, setSelectedId, setTab } = useEntitySelection({
    legacyIdParams: ["member"],
    defaultTab: "details",
  });

  const activeTab: TeamMemberTabId =
    tab && isTeamMemberTab(tab) ? tab : "details";

  const { data: membersData, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.business.members({
      page: 1,
      limit: TEAM_LIST_LIMIT,
      search: debouncedSearch || undefined,
    }),
    queryFn: () =>
      listBusinessMembers({
        page: 1,
        limit: TEAM_LIST_LIMIT,
        search: debouncedSearch || undefined,
      }),
  });

  const members = membersData?.items ?? [];

  useEffect(() => {
    if (!selectedId && members.length > 0) {
      setSelectedId(members[0]!.userId);
    }
  }, [members, selectedId, setSelectedId]);

  const selectedUserId = selectedId ?? members[0]?.userId ?? null;

  const { data: memberDetail, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.business.memberDetail(selectedUserId ?? ""),
    queryFn: () => getTeamMember(selectedUserId!),
    enabled: Boolean(selectedUserId),
  });

  const archiveMutation = useMutation({
    mutationFn: (userId: string) => archiveStaffMember(userId),
    onSuccess: () => {
      toast.success("Staff member archived");
      void invalidateBusinessMembers(queryClient);
      setArchiveTarget(null);
      setSelectedId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const panel = useMemo(() => {
    if (!selectedUserId) {
      return (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Select a staff member to view details.
        </div>
      );
    }
    if (detailLoading || !memberDetail) {
      return (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Loading staff member…
        </div>
      );
    }

    switch (activeTab) {
      case "details":
        return (
          <MemberDetailsTab
            member={memberDetail}
            canManage={canManage}
            onArchive={
              canManage &&
              selectedUserId &&
              selectedUserId !== user?.id
                ? () => setArchiveTarget(selectedUserId)
                : undefined
            }
          />
        );
      case "notifications":
        return (
          <MemberNotificationsTab
            userId={selectedUserId}
            canManage={canManage}
          />
        );
      case "permissions":
        return (
          <MemberPermissionsTab
            userId={selectedUserId}
            role={memberDetail.role}
            canManage={canManage}
          />
        );
      case "services":
        return (
          <MemberServicesTab userId={selectedUserId} canManage={canManage} />
        );
      case "work-hours":
        return (
          <MemberWorkHoursTab userId={selectedUserId} canManage={canManage} />
        );
      case "compensation":
        return (
          <MemberCompensationTab
            userId={selectedUserId}
            role={memberDetail.role}
            canManage={canManage}
          />
        );
      default:
        return null;
    }
  }, [
    activeTab,
    canManage,
    detailLoading,
    memberDetail,
    selectedUserId,
    user?.id,
  ]);

  const isAdminTarget =
    memberDetail?.role === "ADMIN" || memberDetail?.role === "OWNER";

  return (
    <>
      <div className="flex min-h-[calc(100vh-8rem)] flex-col">
        <div className="border-b px-4 py-4">
          <h1 className="text-xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff profiles, permissions, services, and schedules.
          </p>
        </div>
        <div className="flex min-h-0 flex-1">
          <TeamMemberList
            members={members}
            selectedUserId={selectedUserId}
            search={search}
            onSearchChange={setSearch}
            onSelect={setSelectedId}
            onAdd={() => setAddOpen(true)}
            canManage={canManage}
            isLoading={isLoading}
            isError={isError}
            errorMessage={error instanceof Error ? error.message : undefined}
          />
          {selectedUserId ? (
            <TeamMemberTabs
              activeTab={activeTab}
              onTabChange={setTab}
              hidePermissionsAndCompensation={isAdminTarget}
            />
          ) : null}
          <div className="min-w-0 flex-1 overflow-y-auto p-4">{panel}</div>
        </div>
      </div>

      <AddStaffMemberDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be removed from your active staff list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archiveMutation.isPending}
              onClick={() =>
                archiveTarget && archiveMutation.mutate(archiveTarget)
              }
            >
              {archiveMutation.isPending ? "Archiving…" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TeamWorkspace() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <TeamWorkspaceContent />
    </Suspense>
  );
}
