"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listNotes,
  type NotesListFilters,
} from "@/features/notes/api/notes.api";
import { queryKeys } from "@/lib/query/keys";

export function useNotesList(filters: NotesListFilters) {
  return useQuery({
    queryKey: queryKeys.notes.list(filters),
    queryFn: () => listNotes(filters),
    placeholderData: keepPreviousData,
  });
}
