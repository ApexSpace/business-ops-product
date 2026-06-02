"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
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
import { ContactPicker } from "@/components/contacts/contact-picker";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { canInviteMember } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import type {
  BusinessMember,
  Lead,
  PaginatedResult,
  Pipeline,
  Service,
} from "@/types/api";

const schema = z.object({
  contactId: z.string().uuid("Select a contact"),
  pipelineId: z.string().uuid("Select a pipeline"),
  pipelineStageId: z.string().uuid("Select a stage"),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().max(300).optional(),
  value: z.string().optional(),
});

function getFirstStageId(pipeline?: Pipeline): string {
  if (!pipeline?.stages.length) return "";
  return [...pipeline.stages].sort((a, b) => a.position - b.position)[0].id;
}

type FormValues = z.infer<typeof schema>;

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContactId?: string;
  defaultContactLabel?: string;
  /** When set, pipeline is fixed to this CRM board context. */
  defaultPipelineId?: string;
  defaultPipelineStageId?: string;
  onSuccess: () => void;
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  defaultContactId,
  defaultContactLabel,
  defaultPipelineId,
  defaultPipelineStageId,
  onSuccess,
}: CreateLeadDialogProps) {
  const { jwt, contexts } = useAuth();
  const canAssign = canInviteMember(jwt, contexts);
  const lockPipeline = !!defaultPipelineId;
  const {
    data: pipelines,
    isLoading: pipelinesLoading,
    isError: pipelinesError,
  } = useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: () => apiClient<Pipeline[]>("pipelines"),
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

  const { data: services } = useQuery({
    queryKey: queryKeys.services.picker(),
    queryFn: () =>
      apiClient<PaginatedResult<Service>>("services", {
        searchParams: { page: 1, limit: 100, status: "ACTIVE" },
      }),
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

  const form = useForm<FormValues>({
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
    mutationFn: (values: FormValues) =>
      apiClient<Lead>(`leads/from-contact/${values.contactId}`, {
        method: "POST",
        body: {
          pipelineId: values.pipelineId,
          pipelineStageId: values.pipelineStageId,
          serviceId: values.serviceId || undefined,
          assignedToId: values.assignedToId || undefined,
          title: values.title || undefined,
          value:
            values.value === "" || values.value == null
              ? undefined
              : Number(values.value),
        },
      }),
    onSuccess: () => {
      toast.success("Lead created");
      form.reset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
        </DialogHeader>
        <DialogBody>
        {pipelinesLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : pipelinesError ? (
          <p className="text-sm text-destructive">
            Could not load form data. Close and try again.
          </p>
        ) : pipelineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a pipeline first, then you can add leads.
          </p>
        ) : (
          <Form {...form}>
            <FormSchemaProvider schema={schema}>
              <form
                id="create-lead-form"
                onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
                className="space-y-4"
              >
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Contact</FormLabel>
                    <FormControl>
                      <ContactPicker
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search or add contact…"
                        locked={!!lockedContact}
                        lockedContact={lockedContact}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!lockPipeline ? (
                <FormField
                  control={form.control}
                  name="pipelineId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Pipeline</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={pipelineItems}
                          value={field.value || null}
                          onValueChange={(v) => {
                            const pipelineId = v ?? "";
                            field.onChange(pipelineId);
                            const pipeline = pipelines?.find(
                              (p) => p.id === pipelineId,
                            );
                            form.setValue(
                              "pipelineStageId",
                              getFirstStageId(pipeline),
                            );
                          }}
                          placeholder="Select pipeline"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
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
                        disabled={stageItems.length === 0}
                        emptyMessage="This pipeline has no stages yet."
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
                    <FormLabel>Service (optional)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        items={serviceItems}
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? "")}
                        placeholder="Select service"
                        emptyMessage="No services yet. Add services in your catalog first."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Value (USD, optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} step="0.01" />
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
                      <FormLabel>Assigned to (optional)</FormLabel>
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
              </form>
            </FormSchemaProvider>
          </Form>
        )}
        </DialogBody>
        {!pipelinesLoading && !pipelinesError && pipelineItems.length > 0 ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-lead-form"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating…" : "Create lead"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
