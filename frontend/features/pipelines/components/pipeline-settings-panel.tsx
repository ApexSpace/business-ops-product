"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PipelineStagesEditor,
  createNewPipelineStageRow,
  stagesFromPipeline,
  validateStages,
  type EditablePipelineStage,
} from "@/features/pipelines/components/pipeline-stages-editor";
import { Button } from "@/components/ui/button";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import { savePipelineWithStages } from "@/features/pipelines/utils/pipeline-stages";
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
  /** When set (e.g. from the edit page header), keeps the form name in sync. */
  name?: string;
  /** When set, Add stage is rendered by the parent instead of inside the stages editor. */
  onAddStageReady?: (handlers: { addStage: () => void; disabled: boolean }) => void;
}

export function PipelineSettingsPanel({
  pipeline,
  leads,
  canManage,
  onSuccess,
  name,
  onAddStageReady,
}: PipelineSettingsPanelProps) {
  const [editableStages, setEditableStages] = useState<EditablePipelineStage[]>(
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: name ?? pipeline.name },
  });

  const stageLeadCounts = useMemo(
    () => stageLeadCountsFromLeads(leads),
    [leads],
  );

  useEffect(() => {
    form.reset({ name: name ?? pipeline.name });
    setEditableStages(stagesFromPipeline(pipeline));
  }, [pipeline, form, name]);

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

  const addStage = useCallback(() => {
    setEditableStages((prev) => [...prev, createNewPipelineStageRow()]);
  }, []);

  useEffect(() => {
    if (!onAddStageReady) return;
    onAddStageReady({ addStage, disabled: saveMutation.isPending });
  }, [addStage, onAddStageReady, saveMutation.isPending]);

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
          <PipelineStagesEditor
            stages={editableStages}
            onChange={setEditableStages}
            disabled={saveMutation.isPending}
            stageLeadCounts={stageLeadCounts}
            constrainScroll={false}
            showAddStageAction={!onAddStageReady}
          />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
          </form>
        </FormSchemaProvider>
      </Form>
    </>
  );
}
