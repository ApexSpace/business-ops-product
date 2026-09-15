"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { SettingsFormStack } from "@/components/forms/settings-form-grid";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { staffGenderOptions } from "@/features/settings/utils/select-options";
import {
  removeMemberTimeClockPin,
  setMemberTimeClockPin,
} from "@/features/settings/api/business.api";
import {
  updateTeamMemberDetails,
  type TeamMemberDetail,
} from "@/features/team/api/team.api";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import { SETTINGS_FORM_DESCRIPTION_CLASS } from "@/lib/design/settings-form-tokens";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";

const staffGenderValues = [
  "FEMALE",
  "MALE",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
] as const;

type StaffGender = (typeof staffGenderValues)[number];

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  gender: z.enum(staffGenderValues).optional(),
  isServiceProvider: z.boolean(),
  onlineBookingEnabled: z.boolean(),
  canAssignProductSales: z.boolean(),
  canManageWaitlist: z.boolean(),
  pin: z.string().optional(),
  confirmPin: z.string().optional(),
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
    pin: "",
    confirmPin: "",
  };
}

function roleLabel(role: string): string {
  return role === "ADMIN" || role === "OWNER" ? "Admin" : "Normal";
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

type Props = {
  member: TeamMemberDetail;
  canManage: boolean;
};

export function MemberDetailsTab({ member, canManage }: Props) {
  const queryClient = useQueryClient();
  const { isEditing, startEdit, stopEdit } =
    useSettingsSectionEdit<"details">();
  const [pinBusy, setPinBusy] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toMemberFormValues(member),
  });

  useEffect(() => {
    form.reset(toMemberFormValues(member));
    stopEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    member.userId,
    member.createdAt,
    member.hasTimeclockPin,
    member.staffBookingUrl,
  ]);

  const watched = useWatch({ control: form.control });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await updateTeamMemberDetails(member.userId, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber || null,
        gender: values.gender ?? null,
        isServiceProvider: values.isServiceProvider,
        onlineBookingEnabled: values.onlineBookingEnabled,
        canAssignProductSales: values.canAssignProductSales,
        canManageWaitlist: values.canManageWaitlist,
      });

      const pin = values.pin?.trim() ?? "";
      const confirmPin = values.confirmPin?.trim() ?? "";
      if (pin || confirmPin) {
        if (pin !== confirmPin) {
          throw new Error("PIN and confirmation do not match");
        }
        if (!/^\d{4,8}$/.test(pin)) {
          throw new Error("PIN must be 4–8 digits");
        }
        setPinBusy(true);
        try {
          await setMemberTimeClockPin(member.userId, pin);
        } finally {
          setPinBusy(false);
        }
      }
    },
    onSuccess: () => {
      toast.success("Staff details saved");
      stopEdit();
      void invalidateBusinessMembers(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberDetail(member.userId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removePinMutation = useMutation({
    mutationFn: () => removeMemberTimeClockPin(member.userId),
    onSuccess: () => {
      toast.success("Time clock PIN removed");
      void invalidateBusinessMembers(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberDetail(member.userId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fullName =
    [watched.firstName, watched.lastName].filter(Boolean).join(" ") ||
    member.user.email;

  const summaryRows = [
    { label: "Name", value: fullName },
    { label: "User type", value: roleLabel(member.role) },
    { label: "Email", value: watched.email || member.user.email },
    { label: "Phone", value: watched.phoneNumber || null },
    {
      label: "Gender",
      value:
        staffGenderOptions.find((o) => o.value === watched.gender)?.label ??
        null,
    },
    {
      label: "Service provider",
      value: yesNo(Boolean(watched.isServiceProvider)),
    },
    {
      label: "Online booking",
      value: yesNo(Boolean(watched.onlineBookingEnabled)),
    },
  ];

  return (
    <Form {...form}>
      <FormSchemaProvider schema={schema}>
        <SettingsInlineEditSection
          title="Details"
          summary={<SettingsViewRows rows={summaryRows} />}
          isEditing={isEditing("details")}
          onEdit={() => startEdit("details")}
          onDiscard={() => {
            form.reset(toMemberFormValues(member));
            stopEdit();
          }}
          onSave={() =>
            void form.handleSubmit((values) => saveMutation.mutate(values))()
          }
          isDirty={form.formState.isDirty}
          isSaving={saveMutation.isPending || pinBusy}
          disabled={!canManage}
        >
          <SettingsFormStack>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="firstName"
                label="Name"
                placeholder="First name"
              />
              <TextField
                control={form.control}
                name="lastName"
                label="Last name"
                placeholder="Last name"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">User type</p>
              <p className="text-sm text-muted-foreground">
                {roleLabel(member.role)}
              </p>
            </div>
            <TextField
              control={form.control}
              name="email"
              label="Email"
              type="email"
            />
            <TextField control={form.control} name="phoneNumber" label="Phone" />
            <SelectField
              control={form.control}
              name="gender"
              label="Gender"
              placeholder="Select gender"
              items={staffGenderOptions}
              searchable={false}
            />

            <Accordion multiple defaultValue={["additional"]}>
              <AccordionItem value="additional" className="border-none">
                <AccordionTrigger className="px-0 text-base font-medium text-violet-primary-normal hover:no-underline">
                  Additional Options
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-0">
                  <ToggleField
                    control={form.control}
                    name="isServiceProvider"
                    label="Is service provider"
                  />
                  <ToggleField
                    control={form.control}
                    name="canAssignProductSales"
                    label="Can be assigned to product sales"
                  />
                  <ToggleField
                    control={form.control}
                    name="canManageWaitlist"
                    label="Can manage waitlist"
                  />
                  <ToggleField
                    control={form.control}
                    name="onlineBookingEnabled"
                    label="Enable in online booking"
                  />

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Time clock PIN</p>
                    <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
                      {member.hasTimeclockPin
                        ? "A PIN is set. Enter a new PIN below to change it."
                        : "Set a 4–8 digit PIN for the time clock."}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="pin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Enter PIN</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                inputMode="numeric"
                                autoComplete="new-password"
                                placeholder="••••"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm PIN</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                inputMode="numeric"
                                autoComplete="new-password"
                                placeholder="••••"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {member.hasTimeclockPin ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={removePinMutation.isPending}
                        onClick={() => removePinMutation.mutate()}
                      >
                        Remove PIN
                      </Button>
                    ) : null}
                  </div>

                  {member.staffBookingUrl ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Online Booking</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(
                            member.staffBookingUrl!,
                          );
                          toast.success("Direct link copied");
                        }}
                      >
                        <Copy className="mr-1 size-3" aria-hidden />
                        Direct Link
                      </Button>
                    </div>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SettingsFormStack>
        </SettingsInlineEditSection>
      </FormSchemaProvider>
    </Form>
  );
}

function ToggleField({
  control,
  name,
  label,
  description,
}: {
  control: ReturnType<typeof useForm<FormValues>>["control"];
  name:
    | "isServiceProvider"
    | "onlineBookingEnabled"
    | "canAssignProductSales"
    | "canManageWaitlist";
  label: string;
  description?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-1">
            <FormLabel className="text-sm font-medium">{label}</FormLabel>
            {description ? (
              <FormDescription className={SETTINGS_FORM_DESCRIPTION_CLASS}>
                {description}
              </FormDescription>
            ) : null}
          </div>
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              className={DRAWER_SWITCH_CLASS}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
