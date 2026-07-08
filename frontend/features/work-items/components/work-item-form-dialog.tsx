"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { FormSheet } from "@/components/forms/form-sheet";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
  DRAWER_SHEET_CLASS,
  DRAWER_SHEET_CONTENT_CLASS,
  DRAWER_SHEET_DESCRIPTION_CLASS,
  DRAWER_SHEET_HEADER_CLASS,
  DRAWER_SHEET_TITLE_CLASS,
} from "@/components/forms/drawer-sheet";
import {
  WORK_ITEM_DRAWER_FOOTER_CLASS,
} from "@/features/work-items/components/work-item-form-drawer-shell";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { ActionButton } from "@/components/ui/action-button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createWorkItem, updateWorkItem } from "@/features/work-items/api/work-items.api";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { listServices } from "@/features/settings/api/services.api";
import { mapApiFieldErrorsToForm } from "@/lib/forms/map-api-field-errors";
import { ApiClientError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  WORK_ITEM_STATUS_OPTIONS,
  workItemFormDefaults,
  workItemFormSchema,
  workItemFormToApiBody,
  workItemToForm,
  type WorkItemFormValues,
} from "@/features/work-items/schemas/work-item-profile";
import type { WorkItem } from "@/features/work-items/types";

interface WorkItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItem?: WorkItem | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  defaultStatus?: WorkItem["status"];
  onSuccess: () => void;
}

export function WorkItemFormDialog({
  open,
  onOpenChange,
  workItem,
  defaultContactId,
  defaultContactLabel,
  defaultStatus,
  onSuccess,
}: WorkItemFormDialogProps) {
  const isEdit = !!workItem;
  const canAssign = useCan(PERMISSIONS["members.invite"]);

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: workItemFormDefaults,
  });

  const { data: services } = useQuery({
    queryKey: queryKeys.services.picker(),
    queryFn: () =>
      listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
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
        status: defaultStatus ?? workItemFormDefaults.status,
      });
    }
  }, [workItem, form, open, defaultContactId, defaultStatus]);

  const mutation = useMutation({
    mutationFn: (values: WorkItemFormValues) => {
      const body = workItemFormToApiBody(values) as Record<string, unknown>;
      if (isEdit) {
        if (!values.serviceId?.trim()) body.serviceId = null;
        if (!values.assignedToId?.trim()) body.assignedToId = null;
      }
      if (isEdit && workItem) {
        return updateWorkItem(workItem.id, body);
      }
      return createWorkItem(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Work item updated" : "Work item created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (!mapApiFieldErrorsToForm(err, form.setError)) {
        const hint =
          err instanceof ApiClientError && err.requestId
            ? `${err.message} (${err.requestId})`
            : err.message;
        toast.error(hint);
      }
    },
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit work item" : "New work item"}
      description={
        isEdit
          ? "Update customer, service, and work details."
          : "Record customer, service, and work details."
      }
      className={DRAWER_SHEET_CLASS}
      headerClassName={DRAWER_SHEET_HEADER_CLASS}
      titleClassName={DRAWER_SHEET_TITLE_CLASS}
      descriptionClassName={DRAWER_SHEET_DESCRIPTION_CLASS}
      contentClassName={DRAWER_SHEET_CONTENT_CLASS}
      footerClassName={WORK_ITEM_DRAWER_FOOTER_CLASS}
      form={form}
      schema={workItemFormSchema}
      onSubmit={(v) => mutation.mutate(v)}
      isPending={mutation.isPending}
      submitLabel={isEdit ? "Save changes" : "Create work item"}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <p className="flex items-center gap-2 text-xs text-muted-foreground sm:mr-auto">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            {isEdit
              ? "Changes apply when you save this work item"
              : "New work items appear on the board right away"}
          </p>
          <div className={DRAWER_FOOTER_ACTIONS_CLASS}>
            <ActionButton
              type="button"
              disabled={mutation.isPending}
              onClick={() => void submit()}
              className={DRAWER_FOOTER_BUTTON_CLASS}
            >
              {mutation.isPending ? (
                "Saving…"
              ) : (
                <>
                  <Check className="size-4" />
                  {isEdit ? "Save changes" : "Create work item"}
                </>
              )}
            </ActionButton>
          </div>
        </div>
      }
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
    </FormSheet>
  );
}
