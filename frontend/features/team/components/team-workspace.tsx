"use client";

import { Suspense, useEffect, useState } from "react";
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
import {
  getTeamMember,
  resendStaffInvite,
} from "@/features/team/api/team.api";
import {
  TeamMemberPanel,
  TeamMemberPanelLoading,
} from "@/features/team/components/team-member-panel";
import { TeamSidebar } from "@/features/team/components/team-sidebar";
import {
  isTeamMemberTab,
  type TeamMemberTabId,
} from "@/features/team/constants/team-member-tabs";
import { hasStaffPermission } from "@/features/team/permissions/staff-permissions";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { useAuth } from "@/lib/auth/provider";
import { SETTINGS_FORM_SURFACE_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

const TEAM_LIST_LIMIT = 100;

function TeamWorkspaceContent() {
  const queryClient = useQueryClient();
  const { user, jwt } = useAuth();
  const canInviteAsAdmin = useCan(PERMISSIONS["members.invite"]);
  const role = user?.businessRole ?? jwt?.businessRole;
  const staffPermissions =
    user?.staffPermissions ?? jwt?.staffPermissions ?? undefined;
  const canManageTeam =
    canInviteAsAdmin ||
    hasStaffPermission(staffPermissions, "settings.team.manage", role);
  const canManageAdmin = canInviteAsAdmin;
  const canEditDetails = canManageTeam;
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

  const {
    data: memberDetail,
    isLoading: detailLoading,
    isError: detailError,
    error: detailErrorValue,
  } = useQuery({
    queryKey: queryKeys.business.memberDetail(selectedUserId ?? ""),
    queryFn: () => getTeamMember(selectedUserId!),
    enabled: Boolean(selectedUserId),
    retry: false,
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

  const resendMutation = useMutation({
    mutationFn: () => resendStaffInvite(selectedUserId!),
    onSuccess: (data) => {
      toast.success(
        data.inviteLink
          ? "Invite resent. Share the link if the email doesn’t arrive."
          : "Invite resent",
      );
      if (data.inviteLink) {
        void navigator.clipboard.writeText(data.inviteLink).then(
          () => toast.message("Invite link copied to clipboard"),
          () => undefined,
        );
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isAdminTarget =
    memberDetail?.role === "ADMIN" || memberDetail?.role === "OWNER";

  return (
    <>
      <div
        className={cn(
          "flex h-[calc(100vh-8rem)] min-h-[520px] w-full gap-0 overflow-hidden rounded-lg border bg-card",
          SETTINGS_FORM_SURFACE_CLASS,
        )}
      >
        <TeamSidebar
          members={members}
          selectedUserId={selectedUserId}
          search={search}
          onSearchChange={setSearch}
          onSelect={setSelectedId}
          onAdd={() => setAddOpen(true)}
          canManage={canManageTeam}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
        />

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-[var(--spacing-6)]">
          {!selectedUserId ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a staff member to view details.
            </div>
          ) : detailLoading ? (
            <TeamMemberPanelLoading />
          ) : detailError || !memberDetail ? (
            <div className="flex h-full items-center justify-center text-sm text-destructive">
              {detailErrorValue instanceof Error
                ? detailErrorValue.message
                : "Unable to load this staff member."}
            </div>
          ) : (
            <TeamMemberPanel
              member={memberDetail}
              activeTab={activeTab}
              onTabChange={setTab}
              canEditDetails={canEditDetails}
              canManageAdmin={canManageAdmin}
              hidePermissionsAndCompensation={isAdminTarget || !canManageAdmin}
              onArchive={
                canManageAdmin &&
                selectedUserId &&
                selectedUserId !== user?.id
                  ? () => setArchiveTarget(selectedUserId)
                  : undefined
              }
              onResendInvite={
                canEditDetails && memberDetail.status === "INVITED"
                  ? () => resendMutation.mutate()
                  : undefined
              }
              isResendingInvite={resendMutation.isPending}
            />
          )}
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
