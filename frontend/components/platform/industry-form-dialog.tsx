"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { apiClient } from "@/lib/api-client";
import {
  industryFormDefaults,
  industryFormSchema,
  industryFormToApiBody,
  industryToFormValues,
  type IndustryFormValues,
} from "@/lib/industry-form";
import { queryKeys } from "@/lib/query-keys";
import { industryStatusOptions } from "@/lib/select-options";
import type { Industry } from "@/types/api";

interface IndustryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industry?: Industry | null;
}

export function IndustryFormDialog({
  open,
  onOpenChange,
  industry,
}: IndustryFormDialogProps) {
  const isEdit = !!industry;
  const queryClient = useQueryClient();
  const form = useForm<IndustryFormValues>({
    resolver: zodResolver(industryFormSchema),
    defaultValues: industryFormDefaults,
  });

  useEffect(() => {
    if (open && industry) {
      form.reset(industryToFormValues(industry));
    } else if (open) {
      form.reset(industryFormDefaults);
    }
  }, [industry, form, open]);

  const mutation = useMutation({
    mutationFn: (values: IndustryFormValues) => {
      const body = industryFormToApiBody(values, {
        sortOrder: industry?.sortOrder ?? 0,
      });
      if (isEdit && industry) {
        return apiClient<Industry>(`platform/industries/${industry.id}`, {
          method: "PATCH",
          body,
        });
      }
      return apiClient<Industry>("platform/industries", {
        method: "POST",
        body,
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Industry updated" : "Industry created");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.industries.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.industries.active(),
      });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit industry" : "New industry"}
      form={form}
      schema={industryFormSchema}
      onSubmit={(v) => mutation.mutate(v)}
      isPending={mutation.isPending}
      submitLabel={isEdit ? "Save changes" : "Create industry"}
      className="sm:max-w-2xl"
    >
      <div className="max-h-[min(70vh,560px)] space-y-4 overflow-y-auto pr-1">
        <TextField control={form.control} name="name" label="Industry name" />
        <TextField
          control={form.control}
          name="description"
          label="Description"
          multiline
          placeholder="Optional description for platform admins"
        />
        <p className="text-sm font-medium">Sidebar labels</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="contactsLabel"
            label="Contacts label"
          />
          <TextField
            control={form.control}
            name="pipelinesLabel"
            label="Pipelines label"
          />
          <TextField control={form.control} name="leadsLabel" label="Leads label" />
          <TextField
            control={form.control}
            name="workItemsLabel"
            label="Work items label (Visits, Jobs, Cases…)"
          />
          <TextField
            control={form.control}
            name="appointmentsLabel"
            label="Appointments label"
          />
          <TextField
            control={form.control}
            name="conversationsLabel"
            label="Conversations label"
          />
        </div>
        <p className="text-sm font-medium">Default pipeline</p>
        <TextField
          control={form.control}
          name="pipelineName"
          label="Pipeline name"
        />
        <TextField
          control={form.control}
          name="stagesText"
          label="Stages (one per line)"
          multiline
          placeholder={"New Lead\nContacted\nWon\nLost"}
        />
        {isEdit ? (
          <SelectField
            control={form.control}
            name="status"
            label="Status"
            items={industryStatusOptions}
          />
        ) : null}
      </div>
    </FormDialog>
  );
}
