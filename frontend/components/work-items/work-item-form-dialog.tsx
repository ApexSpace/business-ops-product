"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { canInviteMember } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import {
  WORK_ITEM_STATUS_OPTIONS,
  workItemFormDefaults,
  workItemFormSchema,
  workItemFormToApiBody,
  workItemToForm,
  type WorkItemFormValues,
} from "@/lib/work-item-profile";
import type {
  BusinessMember,
  PaginatedResult,
  Service,
  WorkItem,
} from "@/types/api";

interface WorkItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItem?: WorkItem | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  onSuccess: () => void;
}

export function WorkItemFormDialog({
  open,
  onOpenChange,
  workItem,
  defaultContactId,
  defaultContactLabel,
  onSuccess,
}: WorkItemFormDialogProps) {
  const isEdit = !!workItem;
  const { jwt, contexts } = useAuth();
  const canAssign = canInviteMember(jwt, contexts);

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: workItemFormDefaults,
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

  useEffect(() => {
    if (open && workItem) {
      form.reset(workItemToForm(workItem));
    } else if (open) {
      form.reset({
        ...workItemFormDefaults,
        contactId: defaultContactId ?? "",
      });
    }
  }, [workItem, form, open, defaultContactId]);

  const mutation = useMutation({
    mutationFn: (values: WorkItemFormValues) => {
      const body = workItemFormToApiBody(values) as Record<string, unknown>;
      if (isEdit) {
        if (!values.serviceId?.trim()) body.serviceId = null;
        if (!values.assignedToId?.trim()) body.assignedToId = null;
      }
      if (isEdit && workItem) {
        return apiClient<WorkItem>(`work-items/${workItem.id}`, {
          method: "PATCH",
          body,
        });
      }
      return apiClient<WorkItem>("work-items", {
        method: "POST",
        body,
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Updated" : "Created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit" : "New"}
      form={form}
      schema={workItemFormSchema}
      onSubmit={(v) => mutation.mutate(v)}
      isPending={mutation.isPending}
      submitLabel={isEdit ? "Save changes" : "Create"}
      className="sm:max-w-lg"
    >
      <FormField
        control={form.control}
        name="contactId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer</FormLabel>
            <FormControl>
              <ContactPicker
                value={field.value}
                onValueChange={field.onChange}
                placeholder="Search or add customer…"
                locked={!!lockedContact}
                lockedContact={lockedContact}
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
          <FormItem>
            <FormLabel>Service (optional)</FormLabel>
            <FormControl>
              <SearchableSelect
                items={serviceItems}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                placeholder="Select service"
                emptyMessage="No services found"
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
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g. Initial consultation" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <FormControl>
              <SearchableSelect
                items={WORK_ITEM_STATUS_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                value={field.value}
                onValueChange={field.onChange}
                placeholder="Status"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="scheduledAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Scheduled (optional)</FormLabel>
            <FormControl>
              <Input {...field} type="datetime-local" />
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
            <FormItem>
              <FormLabel>Assigned staff (optional)</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={assigneeItems}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
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
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount (optional)</FormLabel>
            <FormControl>
              <Input {...field} type="number" min={0} step="0.01" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  );
}
