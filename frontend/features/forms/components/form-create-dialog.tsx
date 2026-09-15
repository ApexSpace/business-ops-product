"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/forms/text-field";
import { FormDialog } from "@/components/forms/form-dialog";
import { useFormMutations } from "@/features/forms/hooks/use-form-mutations";
import {
  formCreateDefaults,
  formCreateSchema,
  type FormCreateFormValues,
} from "@/features/forms/schemas/form-definition.schema";

interface FormCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

export function FormCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: FormCreateDialogProps) {
  const form = useForm<FormCreateFormValues>({
    resolver: zodResolver(formCreateSchema),
    defaultValues: formCreateDefaults,
  });
  const { createMutation } = useFormMutations();

  useEffect(() => {
    if (!open) {
      form.reset(formCreateDefaults);
    }
  }, [open, form]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create form"
      description="Start with a name — you can add fields in the builder."
      form={form}
      schema={formCreateSchema}
      isPending={createMutation.isPending}
      submitLabel="Create form"
      onSubmit={(values) => {
        createMutation.mutate(values.name.trim(), {
          onSuccess: (record) => {
            onOpenChange(false);
            onCreated(record.id);
          },
        });
      }}
    >
      <TextField
        control={form.control}
        name="name"
        label="Form name"
        placeholder="Lead capture form"
      />
    </FormDialog>
  );
}
