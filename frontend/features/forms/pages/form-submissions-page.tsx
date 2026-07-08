"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  FormSubmissionDetailPanel,
  formSubmissionDrawerSubtitle,
} from "@/features/forms/components/form-submission-detail-panel";
import { useFormDetail } from "@/features/forms/hooks/use-form-detail";
import { useFormSubmissionMutations } from "@/features/forms/hooks/use-form-submission-mutations";
import { useFormSubmissionsList } from "@/features/forms/hooks/use-form-submissions-list";
import type { FormSubmissionListItem } from "@/features/forms/types";
import { formatFormTableDate } from "@/features/forms/utils/form-display.util";
import {
  buildFormFieldLabelMap,
  formatSubmissionSummary,
} from "@/features/forms/utils/form-submission-display.util";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";

interface FormSubmissionsPageProps {
  formId: string;
}

function FormSubmissionsPageContent({ formId }: FormSubmissionsPageProps) {
  const [page, setPage] = useState(1);
  const limit = 25;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection();

  const { data: form, isLoading: isFormLoading } = useFormDetail(formId);
  const { data, isLoading } = useFormSubmissionsList(formId, { page, limit });
  const { deleteMutation } = useFormSubmissionMutations(formId);

  const labelMap = useMemo(
    () => buildFormFieldLabelMap(form?.definition.fields ?? []),
    [form?.definition.fields],
  );

  const selectedSubmission = useMemo(
    () => data?.items.find((item) => item.id === selectedId) ?? null,
    [data?.items, selectedId],
  );

  const columns = useMemo<DataTableColumn<FormSubmissionListItem>[]>(
    () => [
      {
        id: "submitted",
        header: "Submitted",
        sortable: true,
        sortValue: (row) => row.createdAt,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatFormTableDate(row.createdAt)}
          </span>
        ),
      },
      {
        id: "summary",
        header: "Responses",
        cell: (row) => (
          <p className="line-clamp-2 min-w-[240px] text-sm">
            {formatSubmissionSummary(row.data, { labelMap })}
          </p>
        ),
      },
    ],
    [labelMap],
  );

  const deleteTarget = data?.items.find((item) => item.id === deleteId);
  const formName = form?.name ?? "Form";

  return (
    <>
      <Link
        href="/business/settings/forms"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to forms
      </Link>

      <EntityWorkspaceLayout
        title={`${formName} submissions`}
        description="Review and manage responses collected from this form."
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/business/settings/forms/${formId}/edit`} />}
          >
            Edit form
          </Button>
        }
        footer={
          data && data.meta.total > limit ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={setPage}
            />
          ) : data?.items.length
            ? `${data.items.length} submission${data.items.length === 1 ? "" : "s"}`
            : undefined
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading || isFormLoading}
          density="compact"
          activeRowId={selectedId}
          onRowClick={(row) => setSelectedId(row.id)}
          getRowClassName={(row) =>
            selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
          }
          emptyTitle="No submissions yet"
          emptyDescription="Responses will appear here after visitors submit this form."
          rowActions={(submission) => (
            <DataTableRowActions
              menuLabel="Submission actions"
              actions={[
                {
                  label: "View details",
                  onClick: () => setSelectedId(submission.id),
                },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(submission.id),
                  destructive: true,
                },
              ]}
            />
          )}
          className={WORKSPACE_TABLE_CLASS}
        />
      </EntityWorkspaceLayout>

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        width="compact"
        title="Submission details"
        subtitle={
          selectedSubmission
            ? formSubmissionDrawerSubtitle(selectedSubmission)
            : undefined
        }
        overflowActions={
          selectedId
            ? [
                {
                  id: "delete",
                  label: "Delete",
                  destructive: true,
                  onSelect: () => setDeleteId(selectedId),
                },
              ]
            : undefined
        }
      >
        {selectedSubmission ? (
          <FormSubmissionDetailPanel
            submission={selectedSubmission}
            fields={form?.definition.fields ?? []}
          />
        ) : null}
      </EntityDetailDrawer>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete submission?"
        description={
          deleteTarget
            ? `This submission from ${formatFormTableDate(deleteTarget.createdAt)} will be permanently removed.`
            : "This submission will be permanently removed."
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteId) return;
          deleteMutation.mutate(deleteId, {
            onSuccess: () => {
              setDeleteId(null);
              if (selectedId === deleteId) {
                clearSelection();
              }
            },
          });
        }}
      />
    </>
  );
}

export function FormSubmissionsPage({ formId }: FormSubmissionsPageProps) {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <FormSubmissionsPageContent formId={formId} />
    </Suspense>
  );
}
