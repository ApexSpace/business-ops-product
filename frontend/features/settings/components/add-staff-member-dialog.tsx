"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
import {
  createStaffMember,
  type CreateStaffMemberBody,
} from "@/features/settings/api/business.api";
import {
  memberRoleOptions,
  staffGenderOptions,
} from "@/features/settings/utils/select-options";

const pinPattern = /^\d{4}$/;

const addStaffSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phoneNumber: z.string().optional(),
  gender: z
    .enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"])
    .optional(),
  role: z.enum(["ADMIN", "MEMBER"]),
  timeClockPin: z
    .string()
    .optional()
    .refine((v) => !v || pinPattern.test(v), {
      message: "PIN must be exactly 4 digits",
    }),
  isServiceProvider: z.boolean(),
  canAssignProductSales: z.boolean(),
});

type AddStaffForm = z.infer<typeof addStaffSchema>;

type AddStaffMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddStaffMemberDialog({
  open,
  onOpenChange,
}: AddStaffMemberDialogProps) {
  const queryClient = useQueryClient();
  const [showPin, setShowPin] = useState(false);

  const form = useForm<AddStaffForm>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      role: "MEMBER",
      timeClockPin: "",
      isServiceProvider: false,
      canAssignProductSales: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: AddStaffForm) => {
      const body: CreateStaffMemberBody = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        role: values.role,
        isServiceProvider: values.isServiceProvider,
        canAssignProductSales: values.canAssignProductSales,
      };
      if (values.phoneNumber?.trim()) {
        body.phoneNumber = values.phoneNumber.trim();
      }
      if (values.gender) body.gender = values.gender;
      if (values.timeClockPin?.trim()) {
        body.timeClockPin = values.timeClockPin.trim();
      }
      return createStaffMember(body);
    },
    onSuccess: () => {
      toast.success("Staff member added");
      void invalidateBusinessMembers(queryClient);
      form.reset();
      setShowPin(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          form.reset();
          setShowPin(false);
        }
      }}
      title="Add staff member"
      form={form}
      schema={addStaffSchema}
      onSubmit={(v) => createMutation.mutate(v)}
      isPending={createMutation.isPending}
      submitLabel="Create"
      className="sm:max-w-lg"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="firstName"
          label="First name"
          placeholder="Enter first name"
        />
        <TextField
          control={form.control}
          name="lastName"
          label="Last name"
          placeholder="Enter last name"
        />
      </div>
      <TextField
        control={form.control}
        name="email"
        label="Email"
        type="email"
        placeholder="me@example.com"
      />
      <TextField
        control={form.control}
        name="phoneNumber"
        label="Phone"
        placeholder="Enter phone number"
      />
      <SelectField
        control={form.control}
        name="gender"
        label="Gender"
        placeholder="Select gender"
        items={staffGenderOptions}
      />
      <SelectField
        control={form.control}
        name="role"
        label="User type"
        items={memberRoleOptions}
      />
      <FormField
        control={form.control}
        name="timeClockPin"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Time clock PIN</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  {...field}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Enter time clock pin"
                  className="pr-10 tracking-widest"
                  onChange={(e) =>
                    field.onChange(
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0"
                  onClick={() => setShowPin((v) => !v)}
                >
                  {showPin ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="isServiceProvider"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <Label className="font-normal">Is service provider</Label>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="canAssignProductSales"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <Label className="font-normal">
                Can be assigned to product sales
              </Label>
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  );
}
