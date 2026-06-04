"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getLeadAssigneeName } from "@/features/leads/utils/leads";
import { deleteLead, updateLead, updateLeadStage } from "@/features/leads/api/leads.api";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { listServices } from "@/features/settings/api/services.api";
import { queryKeys } from "@/lib/query/keys";
import type { Lead, LeadStatus, Pipeline } from "@/features/leads/types";
import type { LeadDetailFormValues } from "@/features/leads/components/lead-detail-sheet-form";

const schema = z.object({
  title: z.string().max(300).optional(),
  value: z.string().optional(),
  status: z.enum(["ACTIVE", "WON", "LOST", "ARCHIVED"]),
  pipelineStageId: z.string().uuid(),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  source: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
});

function getLeadStageId(lead: Lead): string {
  return lead.pipelineStageId ?? lead.pipelineStage.id;
}

export interface UseLeadDetailSheetOptions {
  open: boolean;
  lead: Lead | null;
  pipeline: Pipeline | null;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useLeadDetailSheet({
  open,
  lead,
  pipeline,
  onSuccess,
  onOpenChange,
}: UseLeadDetailSheetOptions) {
  const canAssign = useCan(PERMISSIONS["members.invite"]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<LeadDetailFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      value: "",
      status: "ACTIVE",
      pipelineStageId: "",
      serviceId: "",
      source: "",
      notes: "",
      assignedToId: "",
    },
  });

  const { data: services } = useQuery({
    queryKey: queryKeys.services.picker(),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: open && canAssign,
  });

  const stageItems = useMemo(() => {
    const stages = pipeline?.stages ?? (lead ? [lead.pipelineStage] : []);
    return [...stages]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ value: s.id, label: s.name }));
  }, [pipeline?.stages, lead]);

  const serviceItems = useMemo(() => {
    const items =
      services?.items.map((s) => ({
        value: s.id,
        label: s.category ? `${s.name} (${s.category})` : s.name,
      })) ?? [];
    if (
      lead?.service &&
      !items.some((i) => i.value === lead.service!.id)
    ) {
      const s = lead.service;
      items.unshift({
        value: s.id,
        label: s.category ? `${s.name} (${s.category})` : s.name,
      });
    }
    return [{ value: "", label: "No service" }, ...items];
  }, [services?.items, lead?.service]);

  const assigneeItems = useMemo(() => {
    const items =
      members?.items.map((m) => ({
        value: m.user.id,
        label:
          [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
          m.user.email,
      })) ?? [];
    if (
      lead?.assignedTo &&
      !items.some((i) => i.value === lead.assignedTo!.id)
    ) {
      items.unshift({
        value: lead.assignedTo.id,
        label: getLeadAssigneeName(lead) ?? lead.assignedTo.email,
      });
    }
    return [{ value: "", label: "Unassigned" }, ...items];
  }, [members?.items, lead]);

  useEffect(() => {
    if (lead && open) {
      form.reset({
        title: lead.title ?? "",
        value: lead.value ?? "",
        status: lead.status,
        pipelineStageId: getLeadStageId(lead),
        serviceId: lead.serviceId ?? "",
        source: lead.source ?? "",
        notes: lead.notes ?? "",
        assignedToId: lead.assignedToId ?? "",
      });
    }
  }, [lead, form, open]);

  const saveMutation = useMutation({
    mutationFn: async (values: LeadDetailFormValues) => {
      if (!lead) throw new Error("No lead selected");

      const stageChanged = getLeadStageId(lead) !== values.pipelineStageId;

      const updated = await updateLead(lead.id, {
        title: values.title || undefined,
        value:
          values.value === "" || values.value == null
            ? undefined
            : Number(values.value),
        status: values.status as LeadStatus,
        serviceId: values.serviceId ? values.serviceId : null,
        source: values.source || undefined,
        notes: values.notes || undefined,
        ...(canAssign
          ? {
              assignedToId: values.assignedToId
                ? values.assignedToId
                : null,
            }
          : {}),
      });

      if (stageChanged) {
        return updateLeadStage(lead.id, {
          pipelineStageId: values.pipelineStageId,
        });
      }

      return updated;
    },
    onSuccess: () => {
      toast.success("Lead saved");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!lead) throw new Error("No lead selected");
      return deleteLead(lead.id);
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      setDeleteOpen(false);
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    form,
    canAssign,
    stageItems,
    serviceItems,
    assigneeItems,
    deleteOpen,
    setDeleteOpen,
    saveMutation,
    deleteMutation,
    schema,
  };
}
