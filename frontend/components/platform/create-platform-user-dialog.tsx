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
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { platformRoleOptions } from "@/lib/select-options";
import type { PlatformMemberRole, PlatformUser } from "@/types/api";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["PLATFORM_ADMIN", "SUPPORT"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreatePlatformUserDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      role: "SUPPORT",
      firstName: "",
      lastName: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiClient<PlatformUser>("platform/users", {
        method: "POST",
        body: {
          ...values,
          role: values.role as PlatformMemberRole,
        },
      }),
    onSuccess: () => {
      toast.success("Platform user added");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.users.all(),
      });
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Add platform user
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add platform user"
        form={form}
        schema={schema}
        onSubmit={(v) => mutation.mutate(v)}
        isPending={mutation.isPending}
        submitLabel="Add user"
      >
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          placeholder="staff@codesol.com"
        />
        <SelectField
          control={form.control}
          name="role"
          label="Role"
          items={platformRoleOptions}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField control={form.control} name="firstName" label="First name" />
          <TextField control={form.control} name="lastName" label="Last name" />
        </div>
      </FormDialog>
    </>
  );
}
