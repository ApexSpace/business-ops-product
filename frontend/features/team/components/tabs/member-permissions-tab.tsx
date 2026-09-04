"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getTeamMemberPermissions,
  updateTeamMemberPermissions,
} from "@/features/team/api/team.api";
import { STAFF_PERMISSION_GROUPS } from "@/features/team/permissions/staff-permissions";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
  SETTINGS_GROUP_TITLE_CLASS,
} from "@/lib/design/settings-form-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  role: string;
  canManage: boolean;
};

export function MemberPermissionsTab({ userId, role, canManage }: Props) {
  const queryClient = useQueryClient();
  const isAdmin = role === "ADMIN" || role === "OWNER";

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.memberPermissions(userId),
    queryFn: () => getTeamMemberPermissions(userId),
  });

  const mutation = useMutation({
    mutationFn: (permissions: Record<string, boolean>) =>
      updateTeamMemberPermissions(userId, permissions),
    onSuccess: () => {
      toast.success("Permissions saved");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberPermissions(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberDetail(userId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return <LoadingState variant="inline" />;
  }

  if (isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Admin users have full access to all features. Permission toggles apply
        only to Normal staff members.
      </p>
    );
  }

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl gap-10")}>
      {STAFF_PERMISSION_GROUPS.map((group) => (
        <section key={group.id} className="space-y-5">
          <h3 className={SETTINGS_GROUP_TITLE_CLASS}>{group.label}</h3>
          <div className="space-y-5">
            {group.permissions.map((permission) => (
              <div
                key={permission.key}
                className="flex items-start gap-4"
              >
                <Switch
                  checked={Boolean(data.permissions[permission.key])}
                  disabled={!canManage || mutation.isPending}
                  onCheckedChange={(checked) =>
                    mutation.mutate({
                      ...data.permissions,
                      [permission.key]: checked,
                    })
                  }
                  className={cn(DRAWER_SWITCH_CLASS, "mt-0.5")}
                  aria-label={permission.label}
                />
                <div className="min-w-0 space-y-1">
                  <Label className="text-sm font-semibold text-foreground">
                    {permission.label}
                  </Label>
                  <p className={cn(SETTINGS_FORM_DESCRIPTION_CLASS, "text-xs")}>
                    {permission.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
