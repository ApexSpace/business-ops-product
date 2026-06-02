"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActionButton } from "@/components/ui/action-button";
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
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { apiClient } from "@/lib/api-client";
import { getLeadDisplayTitle } from "@/lib/leads";
import { queryKeys } from "@/lib/query-keys";
import { leadStatusOptions } from "@/lib/select-options";
import type { Lead, LeadStatus, PaginatedResult, Service } from "@/types/api";

const schema = z.object({
  title: z.string().max(300).optional(),
  value: z.string().optional(),
  status: z.enum(["ACTIVE", "WON", "LOST", "ARCHIVED"]),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  source: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: LeadFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      value: "",
      status: "ACTIVE",
      serviceId: "",
      source: "",
      notes: "",
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

  useEffect(() => {
    if (lead) {
      form.reset({
        title: lead.title ?? "",
        value: lead.value ?? "",
        status: lead.status,
        serviceId: lead.serviceId ?? "",
        source: lead.source ?? "",
        notes: lead.notes ?? "",
      });
    }
  }, [lead, form, open]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!lead) throw new Error("No lead selected");
      return apiClient<Lead>(`leads/${lead.id}`, {
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
        },
      });
    },
    onSuccess: () => {
      toast.success("Lead updated");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getLeadDisplayTitle(lead)} · {lead.pipeline.name} /{" "}
            {lead.pipelineStage.name}
          </p>
        </DialogHeader>
        <DialogBody>
        <Form {...form}>
          <FormSchemaProvider schema={schema}>
            <form
              id="edit-lead-form"
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
            >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
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
                      emptyMessage="No active services. Add services in your catalog."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </form>
          </FormSchemaProvider>
        </Form>
        </DialogBody>
        <DialogFooter>
          <ActionButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </ActionButton>
          <ActionButton
            type="submit"
            form="edit-lead-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
