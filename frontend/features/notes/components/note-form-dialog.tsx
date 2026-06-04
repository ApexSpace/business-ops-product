"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createNote, updateNote } from "@/features/notes/api/notes.api";
import {
  noteFormDefaults,
  noteFormSchema,
  noteFormToApiBody,
  noteToForm,
  type NoteFormValues,
} from "@/features/notes/schemas/note-profile";
import type { Note } from "@/features/notes/types";

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null;
  defaultContactId?: string;
  defaultContactLabel?: string;
  defaultLeadId?: string;
  lockContact?: boolean;
  /** When true, leadId is fixed (e.g. from lead detail). */
  lockLead?: boolean;
  onSuccess: () => void;
}

export function NoteFormDialog({
  open,
  onOpenChange,
  note,
  defaultContactId,
  defaultContactLabel,
  defaultLeadId,
  lockContact,
  lockLead,
  onSuccess,
}: NoteFormDialogProps) {
  const isEdit = !!note;

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: noteFormDefaults,
  });

  const lockedContact = useMemo(() => {
    if (!defaultContactId || !defaultContactLabel) return undefined;
    return { id: defaultContactId, label: defaultContactLabel };
  }, [defaultContactId, defaultContactLabel]);

  useEffect(() => {
    if (!open) return;
    if (note) {
      form.reset(noteToForm(note));
    } else {
      form.reset({
        ...noteFormDefaults,
        contactId: defaultContactId ?? "",
        leadId: defaultLeadId ?? "",
      });
    }
  }, [open, note, defaultContactId, defaultLeadId, form]);

  const mutation = useMutation({
    mutationFn: async (values: NoteFormValues) => {
      const body = noteFormToApiBody(values);
      if (!body.contactId && !body.leadId) {
        throw new Error("Link this note to a contact or lead");
      }
      if (isEdit && note) {
        return updateNote(note.id, body);
      }
      return createNote(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Note updated" : "Note created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const showContactPicker = !lockContact && !lockLead;
  const showLeadField =
    !lockContact && !lockLead && !defaultContactId && !defaultLeadId;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit note" : "New note"}
      form={form}
      schema={noteFormSchema}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
    >
      {showContactPicker ? (
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

      {showLeadField ? (
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
              <Input placeholder="Note title" {...field} />
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
    </FormDialog>
  );
}
