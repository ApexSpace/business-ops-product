"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { invitePlatformBusinessMember } from "@/features/platform/api/platform.api";
import { memberRoleOptions } from "@/features/settings/utils/select-options";
import { queryKeys } from "@/lib/query/keys";

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["ADMIN", "MEMBER"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

export function InvitePlatformBusinessMemberDialog({
  businessId,
  variant = "default",
}: {
  businessId: string;
  variant?: "default" | "action";
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "MEMBER", firstName: "", lastName: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: InviteForm) =>
      invitePlatformBusinessMember(businessId, {
        email: values.email,
        role: values.role,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
      }),
    onSuccess: () => {
      toast.success("Invitation sent");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.businesses.members(businessId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.businesses.utilization(businessId),
      });
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const trigger =
    variant === "action" ? (
      <ActionButton type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Invite member
      </ActionButton>
    ) : (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Invite member
      </Button>
    );

  return (
    <>
      {trigger}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Invite team member"
        description="Send an invitation to join this business workspace."
        form={form}
        schema={inviteSchema}
        onSubmit={(values) => mutation.mutate(values)}
        isPending={mutation.isPending}
        submitLabel="Send invite"
      >
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          placeholder="member@company.com"
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField control={form.control} name="firstName" label="First name" />
          <TextField control={form.control} name="lastName" label="Last name" />
        </div>
        <SelectField
          control={form.control}
          name="role"
          label="Role"
          items={memberRoleOptions}
        />
      </FormDialog>
    </>
  );
}
