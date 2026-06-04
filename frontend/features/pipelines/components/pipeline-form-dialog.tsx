"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PipelineStagesEditor,
  stagesFromPipeline,
  validateStages,
  type EditablePipelineStage,
} from "@/features/pipelines/components/pipeline-stages-editor";
import { ActionButton } from "@/components/ui/action-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { savePipelineWithStages } from "@/features/pipelines/utils/pipeline-stages";
import type { Pipeline } from "@/features/pipelines/types";
import { createPipeline } from "@/features/pipelines/api/pipelines.api";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  isDefault: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PipelineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline?: Pipeline | null;
  onSuccess: () => void;
}

export function PipelineFormDialog({
  open,
  onOpenChange,
  pipeline,
  onSuccess,
}: PipelineFormDialogProps) {
  const isEdit = !!pipeline;
  const [editableStages, setEditableStages] = useState<EditablePipelineStage[]>(
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", isDefault: false },
  });

  useEffect(() => {
    if (open && pipeline) {
      form.reset({ name: pipeline.name, isDefault: pipeline.isDefault });
      setEditableStages(stagesFromPipeline(pipeline));
    } else if (open) {
      form.reset({ name: "", isDefault: false });
      setEditableStages([]);
    }
  }, [pipeline, form, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && pipeline) {
        const stageError = validateStages(editableStages);
        if (stageError) throw new Error(stageError);
        return savePipelineWithStages(
          pipeline,
          values.name,
          editableStages,
        );
      }
      return createPipeline(values);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Pipeline saved" : "Pipeline created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={isEdit ? "max-h-[90vh] max-w-lg overflow-y-auto" : undefined}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit pipeline" : "New pipeline"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <FormSchemaProvider schema={schema}>
            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
            >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Sales pipeline" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && pipeline ? (
              <PipelineStagesEditor
                stages={editableStages}
                onChange={setEditableStages}
                disabled={mutation.isPending}
              />
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <ActionButton
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </ActionButton>
              <ActionButton type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </ActionButton>
            </div>
            </form>
          </FormSchemaProvider>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
