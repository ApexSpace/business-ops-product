"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createTask, updateTask } from "@/features/tasks/api/tasks.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  taskFormDefaults,
  taskFormSchema,
  taskFormToApiBody,
  taskToForm,
  type TaskFormValues,
} from "@/features/tasks/schemas/task-profile";
import type { Task } from "@/features/tasks/types";
import type { BusinessMember, PaginatedResult } from "@/lib/types/shared";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  defaultLeadId?: string;
  lockContact?: boolean;
  lockLead?: boolean;
  onSuccess: () => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultContactId,
  defaultContactLabel,
  defaultLeadId,
  lockContact,
  lockLead,
  onSuccess,
}: TaskFormDialogProps) {
  const isEdit = !!task;
  const canAssign = useCan(PERMISSIONS["members.invite"]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: taskFormDefaults,
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
    if (!open) return;
    if (task) {
      form.reset(taskToForm(task));
    } else {
      form.reset({
        ...taskFormDefaults,
        contactId: defaultContactId ?? "",
        leadId: defaultLeadId ?? "",
      });
    }
  }, [open, task, defaultContactId, defaultLeadId, form]);

  const mutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      const body = taskFormToApiBody(values);
      if (!body.contactId && !body.leadId) {
        throw new Error("Link this task to a contact or lead");
      }
      if (isEdit && task) {
        return updateTask(task.id, body);
      }
      return createTask(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Task updated" : "Task created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit task" : "New task"}
      form={form}
      schema={taskFormSchema}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
      size="lg"
    >
      {!lockContact && !lockLead ? (
        <FormField
          control={form.control}
          name="contactId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact</FormLabel>
              <FormControl>
                <ContactPicker
                  value={field.value ?? ""}
                  onValueChange={(id) => {
                    field.onChange(id);
                    if (id) form.setValue("leadId", "");
                  }}
                  placeholder="Search contact…"
                  locked={!!lockedContact}
                  lockedContact={lockedContact}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {!lockContact && !lockLead && !defaultContactId && !defaultLeadId ? (
        <FormField
          control={form.control}
          name="leadId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead ID (optional if contact set)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Lead UUID"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="Follow up…" {...field} />
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
            <FormLabel>Description</FormLabel>
            <FormControl>
              <RichTextEditor
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="dueAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Due date & time</FormLabel>
            <FormControl>
              <Input type="datetime-local" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={TASK_STATUS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
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
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={[
                    { value: "", label: "None" },
                    ...TASK_PRIORITY_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                    })),
                  ]}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {canAssign ? (
        <FormField
          control={form.control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned to</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={assigneeItems}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </FormDialog>
  );
}
