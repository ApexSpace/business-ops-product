"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createLeadFromContact } from "@/features/leads/api/leads.api";
import { listPipelines } from "@/features/pipelines/api/pipelines.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { listServices } from "@/features/settings/api/services.api";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import type { Pipeline } from "@/features/leads/types";

const schema = z.object({
  contactId: z.string().uuid("Select a contact"),
  pipelineId: z.string().uuid("Select a pipeline"),
  pipelineStageId: z.string().uuid("Select a stage"),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().max(300).optional(),
  value: z.string().optional(),
});

export type CreateLeadFormValues = z.infer<typeof schema>;

function getFirstStageId(pipeline?: Pipeline): string {
  if (!pipeline?.stages.length) return "";
  return [...pipeline.stages].sort((a, b) => a.position - b.position)[0].id;
}

export interface UseCreateLeadDialogOptions {
  open: boolean;
  defaultContactId?: string;
  defaultContactLabel?: string;
  defaultPipelineId?: string;
  defaultPipelineStageId?: string;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useCreateLeadDialog({
  open,
  defaultContactId,
  defaultContactLabel,
  defaultPipelineId,
  defaultPipelineStageId,
  onSuccess,
  onOpenChange,
}: UseCreateLeadDialogOptions) {
  const canAssign = useCan(PERMISSIONS["members.invite"]);
  const lockPipeline = !!defaultPipelineId;

  const {
    data: pipelines,
    isLoading: pipelinesLoading,
    isError: pipelinesError,
  } = useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: () => listPipelines(),
    enabled: open,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: open && canAssign,
  });

  const { data: services } = useQuery({
    queryKey: queryKeys.services.picker(),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const lockedContact = useMemo(() => {
    if (!defaultContactId || !defaultContactLabel) return undefined;
    return { id: defaultContactId, label: defaultContactLabel };
  }, [defaultContactId, defaultContactLabel]);

  const serviceItems = useMemo(() => {
    const items =
      services?.items.map((s) => ({
        value: s.id,
        label: s.category ? `${s.name} (${s.category})` : s.name,
      })) ?? [];
    return [{ value: "", label: "No service" }, ...items];
  }, [services?.items]);

  const pipelineItems = useMemo(
    () =>
      pipelines?.map((p) => ({
        value: p.id,
        label: p.isDefault ? `${p.name} (default)` : p.name,
      })) ?? [],
    [pipelines],
  );

  const resolvedDefaultPipelineId = useMemo(() => {
    if (defaultPipelineId) return defaultPipelineId;
    if (!pipelines?.length) return "";
    return pipelines.find((p) => p.isDefault)?.id ?? pipelines[0].id;
  }, [defaultPipelineId, pipelines]);

  const assigneeItems = useMemo(() => {
    const items =
      members?.items.map((m) => ({
        value: m.user.id,
        label:
          [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
          m.user.email,
      })) ?? [];
    return [{ value: "", label: "Unassigned" }, ...items];
  }, [members?.items]);

  const form = useForm<CreateLeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactId: defaultContactId ?? "",
      pipelineId: "",
      pipelineStageId: "",
      serviceId: "",
      assignedToId: "",
      title: "",
      value: "",
    },
  });

  const selectedPipelineId = useWatch({
    control: form.control,
    name: "pipelineId",
  });

  const selectedPipeline = useMemo(
    () => pipelines?.find((p) => p.id === selectedPipelineId),
    [pipelines, selectedPipelineId],
  );

  const stageItems = useMemo(
    () =>
      [...(selectedPipeline?.stages ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ value: s.id, label: s.name })),
    [selectedPipeline],
  );

  useEffect(() => {
    if (open) {
      const pipeline = pipelines?.find((p) => p.id === resolvedDefaultPipelineId);
      const firstStage = defaultPipelineStageId || getFirstStageId(pipeline);
      form.reset({
        contactId: defaultContactId ?? "",
        pipelineId: resolvedDefaultPipelineId,
        pipelineStageId: firstStage,
        serviceId: "",
        assignedToId: "",
        title: "",
        value: "",
      });
    }
  }, [
    open,
    defaultContactId,
    resolvedDefaultPipelineId,
    defaultPipelineStageId,
    pipelines,
    form,
  ]);

  const mutation = useMutation({
    mutationFn: (values: CreateLeadFormValues) =>
      createLeadFromContact(values.contactId, {
        pipelineId: values.pipelineId,
        pipelineStageId: values.pipelineStageId,
        serviceId: values.serviceId || undefined,
        ...(canAssign
          ? { assignedToId: values.assignedToId || undefined }
          : {}),
        title: values.title || undefined,
        value:
          values.value === "" || values.value == null
            ? undefined
            : Number(values.value),
      }),
    onSuccess: () => {
      toast.success("Lead created");
      form.reset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    form,
    schema,
    canAssign,
    lockPipeline,
    lockedContact,
    pipelines,
    pipelinesLoading,
    pipelinesError,
    pipelineItems,
    stageItems,
    serviceItems,
    assigneeItems,
    mutation,
  };
}
