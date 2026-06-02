"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { BusinessMember } from "@/types/api";

const schema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function SetBusinessOwnerDialog({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiClient<BusinessMember>(`platform/businesses/${businessId}/members/owner`, {
        method: "POST",
        body: {
          email: values.email,
          password: values.password,
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Owner set");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.businesses.members(businessId),
      });
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Set owner
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Set business owner"
        description="Creates (or updates) the owner user and sets their password."
        form={form}
        schema={schema}
        onSubmit={(v) => mutation.mutate(v)}
        isPending={mutation.isPending}
        submitLabel="Set owner"
      >
        <TextField
          control={form.control}
          name="email"
          label="Owner email"
          type="email"
          placeholder="owner@client.com"
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField control={form.control} name="firstName" label="First name" />
          <TextField control={form.control} name="lastName" label="Last name" />
        </div>
        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          placeholder="Minimum 8 characters"
        />
      </FormDialog>
    </>
  );
}

