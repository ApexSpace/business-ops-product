"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  getTeamMemberPermissions,
  updateTeamMemberPermissions,
} from "@/features/team/api/team.api";
import { STAFF_PERMISSION_GROUPS } from "@/features/team/permissions/staff-permissions";
import { queryKeys } from "@/lib/query/keys";

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
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Admin users have full access to all features. Permission toggles
            apply only to Normal staff members.
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggle = (key: string, checked: boolean) => {
    mutation.mutate({ ...data.permissions, [key]: checked });
  };

  return (
    <div className="space-y-4">
      {STAFF_PERMISSION_GROUPS.map((group) => (
        <Card key={group.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.permissions.map((permission) => (
              <div
                key={permission.key}
                className="flex items-start justify-between gap-4 border-b pb-4 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{permission.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {permission.description}
                  </p>
                </div>
                <Switch
                  checked={Boolean(data.permissions[permission.key])}
                  disabled={!canManage || mutation.isPending}
                  onCheckedChange={(checked) =>
                    toggle(permission.key, checked)
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
