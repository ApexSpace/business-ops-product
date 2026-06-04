import { z } from "zod";
import { htmlToPlainText } from "@/features/notes/utils/html-text";
import type { Note } from "@/features/notes/types";

export const noteFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(50000).optional(),
  contactId: z.string().uuid().optional().or(z.literal("")),
  leadId: z.string().uuid().optional().or(z.literal("")),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;

export const noteFormDefaults: NoteFormValues = {
  title: "",
  description: "",
  contactId: "",
  leadId: "",
};

export function noteToForm(note: Note): NoteFormValues {
  return {
    title: note.title,
    description: note.description ?? "",
    contactId: note.contactId ?? "",
    leadId: note.leadId ?? "",
  };
}

export function noteFormToApiBody(values: NoteFormValues) {
  const body: Record<string, string> = {
    title: values.title.trim(),
    description: values.description ?? "",
  };
  if (values.contactId) body.contactId = values.contactId;
  if (values.leadId) body.leadId = values.leadId;
  return body;
}

export function notePreviewText(note: Note): string {
  if (note.descriptionText?.trim()) return note.descriptionText;
  return htmlToPlainText(note.description ?? "");
}
