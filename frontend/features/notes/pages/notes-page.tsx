"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { NoteFormDialog } from "@/features/notes/components/note-form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { deleteNote } from "@/features/notes/api/notes.api";
import { useNotesList } from "@/features/notes/hooks/use-notes-list";
import { notePreviewText } from "@/features/notes/schemas/note-profile";
import { invalidateNoteLists } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import type { Note, PaginatedResult } from "@/features/notes/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function BusinessNotesPageContent() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useNotesList(listFilters);

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      toast.success("Note deleted");
      void invalidateNoteLists(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<Note>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        cell: (row) => (
          <span className="font-medium">{row.title}</span>
        ),
      },
      {
        id: "link",
        header: "Linked to",
        cell: (row) =>
          row.contact?.label ?? row.lead?.title ?? "—",
      },
      {
        id: "description",
        header: "Preview",
        cell: (row) => (
          <span className="line-clamp-2 text-muted-foreground">
            {notePreviewText(row) || "—"}
          </span>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        cell: (row) => formatContactCreatedAt(row.updatedAt),
      },
    ],
    [],
  );

  return (
    <>
      <ListPage
        title="Notes"
        description="Free-form notes linked to contacts and leads."
        actions={
          <ActionButton
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" />
            New note
          </ActionButton>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={params.search}
              onChange={(search) => setParams({ search, page: "1" })}
              placeholder="Search notes…"
              className="max-w-xs"
            />
          </FilterBar>
        }
        pagination={
          data ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="notes"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No notes yet"
          emptyDescription="Create a note from a contact workspace or here."
          rowActions={(row) => (
            <DataTableRowActions
              actions={[
                {
                  label: "Edit",
                  onClick: () => {
                    setEditing(row);
                    setDialogOpen(true);
                  },
                },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(row.id),
                  destructive: true,
                },
              ]}
            />
          )}
        />
      </ListPage>

      <NoteFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        note={editing}
        onSuccess={() => void invalidateNoteLists(queryClient)}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete note?"
        description="This note will be removed permanently."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}

export function NotesPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BusinessNotesPageContent />
    </Suspense>
  );
}
