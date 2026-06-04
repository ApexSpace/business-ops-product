"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PipelineFormDialog } from "@/features/pipelines/components/pipeline-form-dialog";
import {
  PipelineStagesEditor,
  stagesFromPipeline,
  validateStages,
  type EditablePipelineStage,
} from "@/features/pipelines/components/pipeline-stages-editor";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
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
import { deletePipeline, savePipelineWithStages } from "@/features/pipelines/utils/pipeline-stages";
import type { Lead } from "@/features/leads/types";
import type { Pipeline } from "@/features/pipelines/types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
});

type FormValues = z.infer<typeof schema>;

function getLeadStageId(lead: Lead): string {
  return lead.pipelineStageId ?? lead.pipelineStage.id;
}

function stageLeadCountsFromLeads(leads: Lead[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const lead of leads) {
    const id = getLeadStageId(lead);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

interface PipelineSettingsPanelProps {
  pipeline: Pipeline;
  leads: Lead[];
  canManage: boolean;
  onSuccess: () => void;
  onDeleted?: (deletedId: string) => void;
}

export function PipelineSettingsPanel({
  pipeline,
  leads,
  canManage,
  onSuccess,
  onDeleted,
}: PipelineSettingsPanelProps) {
  const [editableStages, setEditableStages] = useState<EditablePipelineStage[]>(
    [],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: pipeline.name },
  });

  const stageLeadCounts = useMemo(
    () => stageLeadCountsFromLeads(leads),
    [leads],
  );

  const pipelineLeadCount = leads.length;

  useEffect(() => {
    form.reset({ name: pipeline.name });
    setEditableStages(stagesFromPipeline(pipeline));
  }, [pipeline, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const stageError = validateStages(editableStages);
      if (stageError) throw new Error(stageError);
      return savePipelineWithStages(pipeline, values.name, editableStages);
    },
    onSuccess: () => {
      toast.success("Pipeline saved");
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deletePipeline(pipeline.id);
      return pipeline.id;
    },
    onSuccess: (deletedId) => {
      toast.success("Pipeline deleted");
      setDeleteOpen(false);
      onDeleted?.(deletedId);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Only owners and admins can change pipeline structure.
      </p>
    );
  }

  return (
    <>
      <Form {...form}>
        <FormSchemaProvider schema={schema}>
          <form
          onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
          className="w-full min-w-0 space-y-6"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pipeline name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <PipelineStagesEditor
            stages={editableStages}
            onChange={setEditableStages}
            disabled={saveMutation.isPending}
            stageLeadCounts={stageLeadCounts}
            constrainScroll={false}
          />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 size-4" />
              New pipeline
            </Button>
          </div>

          <div className="rounded-md border border-destructive/30 p-4">
            <p className="text-sm font-medium text-destructive">Danger zone</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pipelineLeadCount > 0
                ? `This pipeline has ${pipelineLeadCount} lead(s) on the board. Move or delete them in CRM before removing the pipeline.`
                : "Delete this pipeline permanently."}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 text-destructive hover:text-destructive"
              disabled={pipelineLeadCount > 0 || pipeline.isDefault}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete pipeline
            </Button>
            {pipeline.isDefault ? (
              <p className="mt-2 text-xs text-muted-foreground">
                The default pipeline cannot be deleted.
              </p>
            ) : null}
          </div>
          </form>
        </FormSchemaProvider>
      </Form>

      <PipelineFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pipeline={null}
        onSuccess={() => {
          onSuccess();
          setCreateOpen(false);
        }}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete pipeline?"
        description="This pipeline and its stages will be removed. This cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
