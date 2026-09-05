"use client";

import {
  updateTeamMemberNotifications,
  updateTeamMemberPermissions,
} from "@/features/team/api/team.api";
import { queryKeys } from "@/lib/query/keys";
import { useOptimisticQueryPatchMutation } from "@/lib/query/use-optimistic-query-patch-mutation";

type MemberNotificationsData = {
  notificationSettings: Record<string, boolean>;
};

type MemberPermissionsData = {
  role: string;
  permissions: Record<string, boolean>;
};

export function useTeamMemberNotificationMutations(userId: string) {
  return useOptimisticQueryPatchMutation<
    MemberNotificationsData,
    Record<string, boolean>
  >({
    queryKey: queryKeys.business.memberNotifications(userId),
    mutationFn: (notificationSettings) =>
      updateTeamMemberNotifications(userId, notificationSettings),
    applyOptimistic: (_previous, notificationSettings) => ({
      notificationSettings,
    }),
    successMessage: "Notification settings saved",
    invalidate: (qc) =>
      qc.invalidateQueries({
        queryKey: queryKeys.business.memberNotifications(userId),
      }),
  });
}

export function useTeamMemberPermissionMutations(userId: string) {
  return useOptimisticQueryPatchMutation<
    MemberPermissionsData,
    Record<string, boolean>
  >({
    queryKey: queryKeys.business.memberPermissions(userId),
    mutationFn: (permissions) =>
      updateTeamMemberPermissions(userId, permissions),
    applyOptimistic: (previous, permissions) => ({
      ...previous,
      permissions,
    }),
    successMessage: "Permissions saved",
    invalidate: (qc) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.business.memberPermissions(userId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.business.memberDetail(userId),
      });
    },
  });
}
