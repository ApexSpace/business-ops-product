import { api } from "@/lib/api/client";
import type { Note, PaginatedResult } from "@/features/notes/types";

export type NotesListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  contactId?: string;
  leadId?: string;
};

export async function listNotes(
  filters: NotesListFilters = {},
): Promise<PaginatedResult<Note>> {
  const { items, meta } = await api.getPaginated<Note>("notes", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      contactId: filters.contactId,
      leadId: filters.leadId,
    },
  });
  return { items, meta };
}

export function getNote(id: string) {
  return api.get<Note>(`notes/${id}`);
}

export function createNote(body: Record<string, unknown>) {
  return api.post<Note>("notes", body);
}

export function updateNote(id: string, body: Record<string, unknown>) {
  return api.patch<Note>(`notes/${id}`, body);
}

export function deleteNote(id: string) {
  return api.delete<void>(`notes/${id}?confirm=true`);
}
