"use client";

import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/data-display/loading-state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getTeamMemberNotifications } from "@/features/team/api/team.api";
import { useTeamMemberNotificationMutations } from "@/features/team/hooks/use-team-member-preference-mutations";
import { NOTIFICATION_SETTING_KEYS } from "@/features/team/permissions/staff-permissions";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
  SETTINGS_GROUP_TITLE_CLASS,
} from "@/lib/design/settings-form-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

const LABELS: Record<string, { title: string; description: string }> = {
  "appointment.booked": {
    title: "Appointment booked",
    description: "When an appointment is booked with this staff member.",
  },
  "appointment.rescheduled": {
    title: "Appointment rescheduled",
    description: "When an assigned appointment is rescheduled.",
  },
  "appointment.cancelled": {
    title: "Appointment canceled",
    description: "When an assigned appointment is canceled.",
  },
};

type Props = {
  userId: string;
  canManage: boolean;
};

export function MemberNotificationsTab({ userId, canManage }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.memberNotifications(userId),
    queryFn: () => getTeamMemberNotifications(userId),
  });

  const mutation = useTeamMemberNotificationMutations(userId);

  if (isLoading || !data) {
    return <LoadingState variant="inline" />;
  }

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h3 className={SETTINGS_GROUP_TITLE_CLASS}>Appointments</h3>
          <p className="text-sm font-medium text-violet-primary-dark">Email</p>
        </div>

        <div className="space-y-4">
          {NOTIFICATION_SETTING_KEYS.map((key) => {
            const meta = LABELS[key] ?? {
              title: key,
              description: "",
            };
            return (
              <div
                key={key}
                className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0 space-y-1">
                  <Label className="text-sm font-semibold text-violet-primary-dark">
                    {meta.title}
                  </Label>
                  {meta.description ? (
                    <p className={cn(SETTINGS_FORM_DESCRIPTION_CLASS, "text-xs")}>
                      {meta.description}
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={Boolean(data.notificationSettings[key])}
                  disabled={!canManage}
                  onCheckedChange={(checked) =>
                    mutation.mutate({
                      ...data.notificationSettings,
                      [key]: checked,
                    })
                  }
                  className={DRAWER_SWITCH_CLASS}
                  aria-label={meta.title}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
