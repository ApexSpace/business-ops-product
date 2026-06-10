"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { createPlatformCapability } from "@/features/platform/api/capabilities.api";
import {
  createCapabilitySchema,
  type CreateCapabilityValues,
} from "@/features/platform/schemas/capability-form";
import { createCapabilityStatusOptions } from "@/features/platform/utils/select-options";
import { queryKeys } from "@/lib/query/keys";

export function CreateCapabilityDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<CreateCapabilityValues>({
    resolver: zodResolver(createCapabilitySchema),
    defaultValues: {
      name: "",
      description: "",
      status: "DRAFT",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateCapabilityValues) =>
      createPlatformCapability({
        name: values.name,
        description: values.description || undefined,
        status: values.status ?? "DRAFT",
      }),
    onSuccess: (created) => {
      toast.success("Capability created — select modules next");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.capabilities.all(),
      });
      setOpen(false);
      form.reset();
      router.push(`/platform/capabilities/${created.id}?tab=modules`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Create capability
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New capability"
        description="Create a capability bundle. You will select platform modules on the next screen."
        form={form}
        schema={createCapabilitySchema}
        onSubmit={(v) => mutation.mutate(v)}
        isPending={mutation.isPending}
        submitLabel="Create capability"
      >
        <TextField
          control={form.control}
          name="name"
          label="Name"
          placeholder="Sales Suite"
        />
        <TextField
          control={form.control}
          name="description"
          label="Description"
          placeholder="CRM and pipeline features for sales teams"
          multiline
        />
        <SelectField
          control={form.control}
          name="status"
          label="Status"
          items={createCapabilityStatusOptions}
          placeholder="Select status"
          searchable={false}
        />
      </FormDialog>
    </>
  );
}
