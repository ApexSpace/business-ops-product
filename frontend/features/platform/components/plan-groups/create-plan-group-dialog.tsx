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
import { currencySelectOptions } from "@/features/payments/utils/currencies";
import { Button } from "@/components/ui/button";
import { createPlatformPlanGroup } from "@/features/platform/api/plan-groups.api";
import {
  createPlanGroupSchema,
  type CreatePlanGroupValues,
} from "@/features/platform/schemas/plan-group-form";
import { queryKeys } from "@/lib/query/keys";

export function CreatePlanGroupDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<CreatePlanGroupValues>({
    resolver: zodResolver(createPlanGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      currency: "USD",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreatePlanGroupValues) =>
      createPlatformPlanGroup({
        name: values.name,
        description: values.description || undefined,
        currency: values.currency,
      }),
    onSuccess: (created) => {
      toast.success("Plan group created");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.planGroups.all(),
      });
      setOpen(false);
      form.reset();
      router.push(`/platform/plan-groups/${created.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Create plan group
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New plan group"
        description="Create a pricing table group with tiers, capabilities, and embed settings."
        form={form}
        schema={createPlanGroupSchema}
        onSubmit={(v) => mutation.mutate(v)}
        isPending={mutation.isPending}
        submitLabel="Create plan group"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="name"
            label="Name"
            placeholder="SaaS Pricing"
          />
          <SelectField
            control={form.control}
            name="currency"
            label="Currency"
            items={currencySelectOptions}
            placeholder="Select currency"
            searchable={false}
          />
        </div>
        <TextField
          control={form.control}
          name="description"
          label="Description"
          placeholder="Optional marketing description"
          multiline
          rows={3}
        />
      </FormDialog>
    </>
  );
}
