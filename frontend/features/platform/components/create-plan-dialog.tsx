"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createPlatformPlan } from "@/features/platform/api/platform.api";
import { queryKeys } from "@/lib/query/keys";
import type { Plan } from "@/features/platform/types";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priceMonthly: z.number().min(0),
  priceYearly: z.number().min(0).optional(),
  features: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreatePlanDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      priceMonthly: 0,
      priceYearly: 0,
      features: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createPlatformPlan({
          name: values.name,
          description: values.description || undefined,
          priceMonthly: values.priceMonthly,
          priceYearly: values.priceYearly || undefined,
          features: values.features
            ? values.features.split("\n").filter(Boolean)
            : [],
      }),
    onSuccess: () => {
      toast.success("Plan created");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.plans.all(),
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
        Create plan
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New subscription plan"
        form={form}
        schema={schema}
        onSubmit={(v) => mutation.mutate(v)}
        isPending={mutation.isPending}
        submitLabel="Create plan"
      >
        <TextField control={form.control} name="name" label="Name" placeholder="Pro" />
        <TextField
          control={form.control}
          name="description"
          label="Description"
          placeholder="For growing teams"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priceMonthly"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priceYearly"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yearly price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <TextField
          control={form.control}
          name="features"
          label="Features (one per line)"
          multiline
          placeholder="Unlimited contacts"
        />
      </FormDialog>
    </>
  );
}
