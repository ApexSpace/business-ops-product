"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { SearchInput } from "@/components/forms/search-input";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FormCreateDialog } from "@/features/forms/components/form-create-dialog";
import { FormsListHeaderActions } from "@/features/forms/components/forms-list-header-actions";
import { useFormMutations } from "@/features/forms/hooks/use-form-mutations";
import { useFormsList } from "@/features/forms/hooks/use-forms-list";
import type { FormListItem, FormStatus } from "@/features/forms/types";
import { getForm } from "@/features/forms/api/forms.api";
import {
  downloadFormJson,
  formatFormTableDate,
  formStatusLabel,
  formStatusVariant,
} from "@/features/forms/utils/form-display.util";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";

const LIST_SCHEMA = {
  search: { default: "" },
  status: { default: "all" },
  sort: { default: "updatedAt" },
  sortDir: { default: "desc" },
} as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function FormsListPageContent() {
  const router = useRouter();
  const { params, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = {
    search: debouncedSearch || undefined,
    status: params.status as FormStatus | "all",
    sort: params.sort as "name" | "updatedAt" | "createdAt" | "status",
    sortDir: params.sortDir as "asc" | "desc",
  };

  const { data, isLoading } = useFormsList(filters);
  const {
    deleteMutation,
    duplicateMutation,
    publishMutation,
    draftMutation,
    archiveMutation,
  } = useFormMutations();

  const columns = useMemo<DataTableColumn<FormListItem>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-[180px]">
            <Link
              href={`/business/settings/forms/${row.id}/edit`}
              className="font-medium hover:underline"
            >
              {row.name}
            </Link>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <Badge variant={formStatusVariant(row.status)}>
            {formStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: "fields",
        header: "Fields",
        sortable: true,
        sortValue: (row) => row.fieldCount,
        className: "text-right tabular-nums",
        cell: (row) => <span className="text-sm">{row.fieldCount}</span>,
      },
      {
        id: "submissions",
        header: "Submissions",
        sortable: true,
        sortValue: (row) => row.submissionCount,
        className: "text-right tabular-nums",
        cell: (row) =>
          row.submissionCount > 0 ? (
            <Link
              href={`/business/settings/forms/${row.id}/submissions`}
              className="text-sm font-medium hover:underline"
            >
              {row.submissionCount}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">0</span>
          ),
      },
      {
        id: "updated",
        header: "Updated",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatFormTableDate(row.updatedAt)}
          </span>
        ),
      },
      {
        id: "created",
        header: "Created",
        sortable: true,
        sortValue: (row) => row.createdAt,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatFormTableDate(row.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const deleteTarget = data?.items.find((item) => item.id === deleteId);

  return (
    <>
      <ListPage
        title="Forms"
        description="Build lead capture forms for your website and landing pages."
        actions={
          <FormsListHeaderActions onCreate={() => setCreateOpen(true)} />
        }
        filters={
          <FilterBar>
            <SearchInput
              value={params.search}
              onChange={(value) => setParams({ search: value })}
              placeholder="Search forms…"
            />
            <SearchableSelect
              items={STATUS_OPTIONS}
              value={params.status}
              onValueChange={(value) =>
                setParams({ status: value ?? "all" })
              }
              searchable={false}
              triggerClassName="w-[180px]"
            />
          </FilterBar>
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No forms yet"
          emptyDescription="Create your first lead capture form."
          emptyAction={
            <ActionButton onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create form
            </ActionButton>
          }
          rowActions={(form) => (
            <DataTableRowActions
              menuLabel={`Actions for ${form.name}`}
              actions={[
                {
                  label: "Edit",
                  onClick: () =>
                    router.push(`/business/settings/forms/${form.id}/edit`),
                },
                {
                  label: "View submissions",
                  onClick: () =>
                    router.push(
                      `/business/settings/forms/${form.id}/submissions`,
                    ),
                },
                {
                  label: "Duplicate",
                  onClick: () => duplicateMutation.mutate(form.id),
                },
                form.status === "published"
                  ? {
                      label: "Move to draft",
                      onClick: () => draftMutation.mutate(form.id),
                    }
                  : {
                      label: "Publish",
                      onClick: () => publishMutation.mutate(form.id),
                    },
                ...(form.status !== "archived"
                  ? [
                      {
                        label: "Archive",
                        onClick: () => archiveMutation.mutate(form.id),
                      },
                    ]
                  : []),
                {
                  label: "Export JSON",
                  onClick: async () => {
                    const record = await getForm(form.id);
                    downloadFormJson(record);
                  },
                },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(form.id),
                  destructive: true,
                },
              ]}
            />
          )}
        />
      </ListPage>

      <FormCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          router.push(`/business/settings/forms/${id}/edit`);
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete form?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed from this workspace.`
            : "This form will be permanently removed."
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}

export function FormsListPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <FormsListPageContent />
    </Suspense>
  );
}
