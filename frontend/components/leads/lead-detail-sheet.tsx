"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { LeadRelatedRecords } from "@/components/leads/lead-related-records";
import { SearchableSelect } from "@/components/forms/searchable-select";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { apiClient } from "@/lib/api-client";
import {
  formatLeadCreatedAt,
  formatLeadValue,
  getLeadAssigneeName,
  getLeadContactName,
  getLeadDisplayTitle,
  getLeadServiceLabel,
} from "@/lib/leads";
import { canInviteMember } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { leadStatusOptions } from "@/lib/select-options";
import { useAuth } from "@/lib/auth-provider";
import type {
  BusinessMember,
  Lead,
  LeadStatus,
  PaginatedResult,
  Pipeline,
  Service,
} from "@/types/api";

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

type FormValues = z.infer<typeof schema>;

function getLeadStageId(lead: Lead): string {
  return lead.pipelineStageId ?? lead.pipelineStage.id;
}

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  pipeline: Pipeline | null;
  onSuccess: () => void;
}

export function LeadDetailSheet({
  open,
  onOpenChange,
  lead,
  pipeline,
  onSuccess,
}: LeadDetailSheetProps) {
  const { jwt, contexts } = useAuth();
  const canAssign = canInviteMember(jwt, contexts);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<FormValues>({
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
    queryFn: () =>
      apiClient<PaginatedResult<Service>>("services", {
        searchParams: { page: 1, limit: 100, status: "ACTIVE" },
      }),
    enabled: open,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () =>
      apiClient<PaginatedResult<BusinessMember>>("businesses/current/members", {
        searchParams: { page: 1, limit: 100 },
      }),
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
    mutationFn: async (values: FormValues) => {
      if (!lead) throw new Error("No lead selected");

      const stageChanged = getLeadStageId(lead) !== values.pipelineStageId;

      const updated = await apiClient<Lead>(`leads/${lead.id}`, {
        method: "PATCH",
        body: {
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
        },
      });

      if (stageChanged) {
        return apiClient<Lead>(`leads/${lead.id}/stage`, {
          method: "PATCH",
          body: { pipelineStageId: values.pipelineStageId },
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
      return apiClient(`leads/${lead.id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      });
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      setDeleteOpen(false);
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!lead) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{getLeadDisplayTitle(lead)}</SheetTitle>
            <SheetDescription>
              {getLeadContactName(lead)} · {lead.pipeline.name} · Created{" "}
              {formatLeadCreatedAt(lead.createdAt)}
            </SheetDescription>
          </SheetHeader>

          <LeadRelatedRecords lead={lead} />

          <div className="space-y-1 px-4 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground">Service:</span>{" "}
              {getLeadServiceLabel(lead)}
            </p>
            <p>
              <span className="text-foreground">Value:</span>{" "}
              {formatLeadValue(lead.value)}
            </p>
            {getLeadAssigneeName(lead) ? (
              <p>
                <span className="text-foreground">Assigned:</span>{" "}
                {getLeadAssigneeName(lead)}
              </p>
            ) : null}
          </div>

          <Form {...form}>
            <FormSchemaProvider schema={schema}>
              <form
              onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
              className="flex flex-1 flex-col gap-4 px-4 pb-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Deal title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pipelineStageId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Stage</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        items={stageItems}
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? "")}
                        placeholder="Select stage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value (USD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        items={leadStatusOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Service</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        items={serviceItems}
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? "")}
                        placeholder="Select service"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {canAssign ? (
                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Assigned to</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={assigneeItems}
                          value={field.value || null}
                          onValueChange={(v) => field.onChange(v ?? "")}
                          placeholder="Unassigned"
                          emptyMessage="No team members found"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="flex-col items-end gap-2 px-0 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </SheetFooter>
              </form>
            </FormSchemaProvider>
          </Form>
        </SheetContent>
      </Sheet>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete lead?"
        description="This lead will be removed from the pipeline. This cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
