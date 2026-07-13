"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  staffGenderOptions,
} from "@/features/settings/utils/select-options";
import {
  resendStaffInvite,
  updateTeamMemberDetails,
  type TeamMemberDetail,
} from "@/features/team/api/team.api";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { MemberTimeClockPinDialog } from "@/features/settings/components/member-time-clock-pin-dialog";
import { useState } from "react";

const staffGenderValues = [
  "FEMALE",
  "MALE",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
] as const;

type StaffGender = (typeof staffGenderValues)[number];

const schema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  gender: z.enum(staffGenderValues).optional(),
  isServiceProvider: z.boolean(),
  onlineBookingEnabled: z.boolean(),
  canAssignProductSales: z.boolean(),
  canManageWaitlist: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function toStaffGender(value: string | null | undefined): StaffGender | undefined {
  if (!value) return undefined;
  return (staffGenderValues as readonly string[]).includes(value)
    ? (value as StaffGender)
    : undefined;
}

function toMemberFormValues(member: TeamMemberDetail): FormValues {
  return {
    firstName: member.user.firstName ?? "",
    lastName: member.user.lastName ?? "",
    email: member.user.email,
    phoneNumber: member.phoneNumber ?? "",
    gender: toStaffGender(member.gender),
    isServiceProvider: member.isServiceProvider ?? false,
    onlineBookingEnabled: member.onlineBookingEnabled ?? false,
    canAssignProductSales: member.canAssignProductSales ?? false,
    canManageWaitlist: member.canManageWaitlist ?? false,
  };
}

type Props = {
  member: TeamMemberDetail;
  canManage: boolean;
  onArchive?: () => void;
};

export function MemberDetailsTab({ member, canManage, onArchive }: Props) {
  const queryClient = useQueryClient();
  const [pinOpen, setPinOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toMemberFormValues(member),
  });

  useEffect(() => {
    form.reset(toMemberFormValues(member));
  }, [member, form]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateTeamMemberDetails(member.userId, values),
    onSuccess: () => {
      toast.success("Staff details saved");
      void invalidateBusinessMembers(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberDetail(member.userId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendStaffInvite(member.userId),
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

  const copyLink = () => {
    if (!member.staffBookingUrl) return;
    void navigator.clipboard.writeText(member.staffBookingUrl);
    toast.success("Booking link copied");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="firstName" label="First name" />
                <TextField control={form.control} name="lastName" label="Last name" />
              </div>
              <TextField control={form.control} name="email" label="Email" type="email" />
              <TextField control={form.control} name="phoneNumber" label="Phone" />
              <SelectField
                control={form.control}
                name="gender"
                label="Gender"
                placeholder="Select gender"
                items={staffGenderOptions}
              />
              <p className="text-sm text-muted-foreground">
                User type:{" "}
                <span className="font-medium text-foreground">
                  {member.role === "ADMIN" || member.role === "OWNER"
                    ? "Admin"
                    : "Normal"}
                </span>
              </p>
              <div className="space-y-3 rounded-lg border p-3">
                <ToggleRow
                  label="Service provider"
                  checked={form.watch("isServiceProvider")}
                  onCheckedChange={(v) => form.setValue("isServiceProvider", v)}
                  disabled={!canManage}
                />
                <ToggleRow
                  label="Enabled in online booking"
                  checked={form.watch("onlineBookingEnabled")}
                  onCheckedChange={(v) =>
                    form.setValue("onlineBookingEnabled", v)
                  }
                  disabled={!canManage}
                />
                <ToggleRow
                  label="Can be assigned to product sales"
                  checked={form.watch("canAssignProductSales")}
                  onCheckedChange={(v) =>
                    form.setValue("canAssignProductSales", v)
                  }
                  disabled={!canManage}
                />
                <ToggleRow
                  label="Can manage waitlist"
                  checked={form.watch("canManageWaitlist")}
                  onCheckedChange={(v) => form.setValue("canManageWaitlist", v)}
                  disabled={!canManage}
                />
              </div>
              {member.staffBookingUrl ? (
                <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="mr-1.5 size-3.5" />
                  Copy online booking link
                </Button>
              ) : null}
              {canManage ? (
                <Button type="submit" disabled={saveMutation.isPending}>
                  Save details
                </Button>
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Status: {member.status}
            {member.user.status === "INVITED" ? " (awaiting activation)" : ""}
          </p>
          {canManage && member.status === "INVITED" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resendMutation.isPending}
              onClick={() => resendMutation.mutate()}
            >
              Resend invite email
            </Button>
          ) : null}
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPinOpen(true)}
            >
              {member.hasTimeclockPin ? "Change time clock PIN" : "Set time clock PIN"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {canManage && onArchive ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Danger zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Archiving removes this person from your active staff list. They
              will no longer have access to this business.
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onArchive}
            >
              Archive staff member
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <MemberTimeClockPinDialog
        member={member}
        open={pinOpen}
        onOpenChange={setPinOpen}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="font-normal">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
