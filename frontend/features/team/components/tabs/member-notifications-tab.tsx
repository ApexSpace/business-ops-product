"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getTeamMemberNotifications,
  updateTeamMemberNotifications,
} from "@/features/team/api/team.api";
import { queryKeys } from "@/lib/query/keys";
import { NOTIFICATION_SETTING_KEYS } from "@/features/team/permissions/staff-permissions";

const LABELS: Record<string, { title: string; description: string }> = {
  "appointment.booked": {
    title: "Appointment booked",
    description: "Email when an appointment is booked with this staff member.",
  },
  "appointment.rescheduled": {
    title: "Appointment rescheduled",
    description: "Email when an assigned appointment is rescheduled.",
  },
  "appointment.cancelled": {
    title: "Appointment canceled",
    description: "Email when an assigned appointment is canceled.",
  },
};

type Props = {
  userId: string;
  canManage: boolean;
};

export function MemberNotificationsTab({ userId, canManage }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.memberNotifications(userId),
    queryFn: () => getTeamMemberNotifications(userId),
  });

  const mutation = useMutation({
    mutationFn: (notificationSettings: Record<string, boolean>) =>
      updateTeamMemberNotifications(userId, notificationSettings),
    onSuccess: () => {
      toast.success("Notification settings saved");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberNotifications(userId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Appointment notifications for service providers. Push and SMS are not
          available yet.
        </p>
        {NOTIFICATION_SETTING_KEYS.map((key) => {
          const meta = LABELS[key];
          return (
            <div
              key={key}
              className="flex items-start justify-between gap-4 border-b pb-4 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{meta.title}</p>
                <p className="text-sm text-muted-foreground">
                  {meta.description}
                </p>
              </div>
              <Switch
                checked={data.notificationSettings[key] ?? false}
                disabled={!canManage || mutation.isPending}
                onCheckedChange={(checked) =>
                  mutation.mutate({
                    ...data.notificationSettings,
                    [key]: checked,
                  })
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
