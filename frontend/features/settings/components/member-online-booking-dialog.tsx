"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateStaffMemberProfile } from "@/features/settings/api/business.api";
import type { BusinessMember } from "@/features/settings/types";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
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
  member: BusinessMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MemberOnlineBookingDialog({
  member,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const [onlineBookingEnabled, setOnlineBookingEnabled] = useState(
    member?.onlineBookingEnabled ?? true,
  );
  const [isServiceProvider, setIsServiceProvider] = useState(
    member?.isServiceProvider ?? false,
  );
  const [canManageWaitlist, setCanManageWaitlist] = useState(
    member?.canManageWaitlist ?? false,
  );
  const [useBusinessHours, setUseBusinessHours] = useState(true);
  const [scheduleSlots, setScheduleSlots] = useState<BusinessHoursSlot[]>(
    defaultBusinessHoursSlots(),
  );

  const scheduleQuery = useQuery({
    queryKey: ["staff-work-schedule", member?.userId],
    queryFn: () => getStaffWorkSchedule(member!.userId),
    enabled: open && !!member?.userId,
  });

  useEffect(() => {
    if (!member) return;
    setOnlineBookingEnabled(member.onlineBookingEnabled ?? true);
    setIsServiceProvider(member.isServiceProvider ?? false);
    setCanManageWaitlist(member.canManageWaitlist ?? false);
  }, [member]);

  useEffect(() => {
    if (!scheduleQuery.data) return;
    setUseBusinessHours(scheduleQuery.data.useBusinessHours);
    setScheduleSlots(normalizeBusinessHoursSlots(scheduleQuery.data.slots));
  }, [scheduleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateStaffMemberProfile(member!.userId, {
        onlineBookingEnabled,
        isServiceProvider,
        canManageWaitlist,
      });
      await updateStaffWorkSchedule(member!.userId, {
        useBusinessHours,
        ...(useBusinessHours ? {} : { slots: scheduleSlots }),
      });
    },
    onSuccess: async () => {
      toast.success("Staff online booking updated");
      await invalidateBusinessMembers(queryClient);
      void queryClient.invalidateQueries({
        queryKey: ["staff-work-schedule", member?.userId],
      });
      void queryClient.invalidateQueries({ queryKey: ["business-hours"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const memberName =
    [member?.user.firstName, member?.user.lastName].filter(Boolean).join(" ") ||
    member?.user.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Online booking — {memberName}</DialogTitle>
          <DialogDescription>
            Control whether this staff member appears in public booking, their
            work schedule, and copy their direct link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="flex items-center justify-between">
            <Label>Service provider</Label>
            <Switch
              checked={isServiceProvider}
              onCheckedChange={setIsServiceProvider}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enabled in online booking</Label>
            <Switch
              checked={onlineBookingEnabled}
              onCheckedChange={setOnlineBookingEnabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Can manage waitlist</Label>
              <p className="text-xs text-muted-foreground">
                Book or dismiss waitlist matches from the calendar
              </p>
            </div>
            <Switch
              checked={canManageWaitlist}
              onCheckedChange={setCanManageWaitlist}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Work schedule</p>
                <p className="text-xs text-muted-foreground">
                  {useBusinessHours
                    ? "This staff member follows your business-wide hours."
                    : "Set custom hours for this staff member only."}
                </p>
              </div>
              <Switch
                checked={useBusinessHours}
                onCheckedChange={setUseBusinessHours}
                aria-label="Use business hours"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {useBusinessHours
                ? "Uses Settings → Profile → Business hours. Turn off to set a custom schedule below."
                : "Custom schedule is used first on the calendar and in online booking. Click Save when done."}
            </p>
            {!useBusinessHours ? (
              scheduleQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading schedule…</p>
              ) : (
                <BusinessHoursEditor
                  slots={scheduleSlots}
                  onChange={setScheduleSlots}
                />
              )
            ) : null}
          </div>

          {member?.staffBookingUrl ? (
            <div className="flex items-center gap-2 rounded border p-2 text-sm">
              <span className="flex-1 truncate">{member.staffBookingUrl}</span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(member.staffBookingUrl!);
                  toast.success("Copied staff booking link");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enable business online booking in Settings to generate staff links.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !member}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
