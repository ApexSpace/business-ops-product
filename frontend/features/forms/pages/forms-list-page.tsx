"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { FormCreateDialog } from "@/features/forms/components/form-create-dialog";
import { FormShareDialog } from "@/features/forms/components/form-share-dialog";
import { useFormMutations } from "@/features/forms/hooks/use-form-mutations";
import { useFormStaffPermissions } from "@/features/forms/hooks/use-form-staff-permissions";
import { useFormsList } from "@/features/forms/hooks/use-forms-list";
import { useFormsHost } from "@/features/forms/forms-host-context";
import type { FormListItem, FormStatus } from "@/features/forms/types";
import { getForm } from "@/features/forms/api/forms.api";
import {
  downloadFormJson,
  formatFormTableDate,
  formStatusLabel,
  formStatusVariant,
} from "@/features/forms/utils/form-display.util";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  ALL_STATUSES_ALL_OPTION,
} from "@/lib/ui/filter-labels";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";

const LIST_SCHEMA = {
  search: { default: "" },
  status: { default: "all" },
  sort: { default: "updatedAt" },
  sortDir: { default: "desc" },
} as const;

const STATUS_OPTIONS = [
  ALL_STATUSES_ALL_OPTION,
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function FormsListPageContent() {
  const router = useRouter();
  const { basePath, apiBase } = useFormsHost();
  const { params, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(params.status);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareForm, setShareForm] = useState<FormListItem | null>(null);
  const { canManageTemplates } = useFormStaffPermissions();

  const filters = {
    search: debouncedSearch || undefined,
    status: params.status as FormStatus | "all",
    sort: params.sort as "name" | "updatedAt" | "createdAt" | "status",
    sortDir: params.sortDir as "asc" | "desc",
  };

  const { data, isLoading, isError, error, refetch } = useFormsList(filters);
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
              href={`${basePath}/${row.id}/edit`}
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
              href={`${basePath}/${row.id}/submissions`}
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
    [basePath],
  );

  const deleteTarget = data?.items.find((item) => item.id === deleteId);

  return (
    <>
      <EntityListLayout
        title="Forms"
        description="Build lead capture forms for your website and landing pages."
        addButtonLabel="Create form"
        onAdd={canManageTemplates ? () => setCreateOpen(true) : undefined}
        searchPlaceholder="Search forms…"
        searchValue={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        filterAriaLabel="Form filters"
        filterActive={params.status !== "all"}
        filterOpen={filterOpen}
        onFilterOpenChange={(open) => {
          if (open) setDraftStatus(params.status);
          setFilterOpen(open);
        }}
        filterContent={
          <ListFilterCheckboxGroup
            legend="Status"
            options={STATUS_OPTIONS}
            value={draftStatus}
            onChange={(next) => setDraftStatus(String(next))}
          />
        }
        onFilterApply={() => setParams({ status: draftStatus })}
        error={
          isError ? (
            <ApiErrorState error={error} onRetry={() => void refetch()} />
          ) : undefined
        }
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No forms yet"
        emptyDescription="Create your first lead capture form."
        emptyAction={
          canManageTemplates ? (
            <ActionButton onClick={() => setCreateOpen(true)}>
              Create form
            </ActionButton>
          ) : undefined
        }
        rowActions={(form) => (
            <DataTableRowActions
              menuLabel={`Actions for ${form.name}`}
              actions={[
                ...(canManageTemplates
                  ? [
                      {
                        label: "Edit",
                        onClick: () =>
                          router.push(`${basePath}/${form.id}/edit`),
                      },
                    ]
                  : []),
                {
                  label: "View submissions",
                  onClick: () =>
                    router.push(`${basePath}/${form.id}/submissions`),
                },
                ...(canManageTemplates
                  ? [
                      {
                        label: "Duplicate",
                        onClick: () => duplicateMutation.mutate(form.id),
                      },
                      ...(form.status === "published"
                        ? [
                            {
                              label: "Share link",
                              onClick: () => setShareForm(form),
                            },
                          ]
                        : []),
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
                          const record = await getForm(form.id, apiBase);
                          downloadFormJson(record);
                        },
                      },
                      {
                        label: "Delete",
                        onClick: () => setDeleteId(form.id),
                        destructive: true,
                      },
                    ]
                  : []),
              ]}
            />
        )}
      />

      {canManageTemplates ? (
        <FormCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => {
            router.push(`${basePath}/${id}/edit`);
          }}
        />
      ) : null}

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

      <FormShareDialog
        open={!!shareForm}
        onOpenChange={(open) => !open && setShareForm(null)}
        formId={shareForm?.id ?? null}
        status={shareForm?.status ?? "draft"}
        formName={shareForm?.name}
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
