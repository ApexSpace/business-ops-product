"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BusinessHoursEditor } from "@/features/business-hours/components/business-hours-editor";
import {
  defaultBusinessHoursSlots,
  normalizeBusinessHoursSlots,
} from "@/features/business-hours/utils/default-business-hours";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import {
  getStaffWorkSchedule,
  updateStaffWorkSchedule,
} from "@/features/online-booking-settings/api/online-booking-settings.api";

type Props = {
  userId: string;
  canManage: boolean;
};

export function MemberWorkHoursTab({ userId, canManage }: Props) {
  const [useBusinessHours, setUseBusinessHours] = useState(true);
  const [scheduleSlots, setScheduleSlots] = useState<BusinessHoursSlot[]>(
    defaultBusinessHoursSlots(),
  );

  const scheduleQuery = useQuery({
    queryKey: ["staff-work-schedule", userId],
    queryFn: () => getStaffWorkSchedule(userId),
  });

  useEffect(() => {
    if (!scheduleQuery.data) return;
    setUseBusinessHours(scheduleQuery.data.useBusinessHours);
    setScheduleSlots(normalizeBusinessHoursSlots(scheduleQuery.data.slots));
  }, [scheduleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateStaffWorkSchedule(userId, {
        useBusinessHours,
        slots: useBusinessHours ? [] : scheduleSlots,
      });
    },
    onSuccess: () => toast.success("Work hours saved"),
    onError: (err: Error) => toast.error(err.message),
  });

  if (scheduleQuery.isLoading) {
    return <LoadingState variant="inline" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label className="font-normal">Use business hours</Label>
          <Switch
            checked={useBusinessHours}
            disabled={!canManage}
            onCheckedChange={setUseBusinessHours}
          />
        </div>
        {!useBusinessHours ? (
          <BusinessHoursEditor
            slots={scheduleSlots}
            onChange={setScheduleSlots}
            disabled={!canManage}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            This staff member follows your business-wide hours from Business
            Profile settings.
          </p>
        )}
        {canManage ? (
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            Save work hours
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
