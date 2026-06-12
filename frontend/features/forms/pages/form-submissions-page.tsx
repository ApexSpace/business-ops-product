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
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ActionButton } from "@/components/ui/action-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { FormSubmissionDetailDialog } from "@/features/forms/components/form-submission-detail-dialog";
import { useFormDetail } from "@/features/forms/hooks/use-form-detail";
import { useFormSubmissionMutations } from "@/features/forms/hooks/use-form-submission-mutations";
import { useFormSubmissionsList } from "@/features/forms/hooks/use-form-submissions-list";
import type { FormSubmissionListItem } from "@/features/forms/types";
import { formatFormTableDate } from "@/features/forms/utils/form-display.util";
import { formatSubmissionSummary } from "@/features/forms/utils/form-submission-display.util";

interface FormSubmissionsPageProps {
  formId: string;
}

function FormSubmissionsPageContent({ formId }: FormSubmissionsPageProps) {
  const [page, setPage] = useState(1);
  const limit = 25;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewSubmission, setViewSubmission] =
    useState<FormSubmissionListItem | null>(null);

  const { data: form, isLoading: isFormLoading } = useFormDetail(formId);
  const { data, isLoading } = useFormSubmissionsList(formId, { page, limit });
  const { deleteMutation } = useFormSubmissionMutations(formId);

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
            {formatSubmissionSummary(row.data)}
          </p>
        ),
      },
    ],
    [],
  );

  const deleteTarget = data?.items.find((item) => item.id === deleteId);
  const formName = form?.name ?? "Form";

  return (
    <>
      <ListPage
        title={`${formName} submissions`}
        description="Review and manage responses collected from this form."
        actions={
          <ActionButton variant="outline" asChild>
            <Link href={`/business/settings/forms/${formId}/edit`}>
              Edit form
            </Link>
          </ActionButton>
        }
      >
        <Link
          href="/business/settings/forms"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to forms
        </Link>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading || isFormLoading}
          emptyTitle="No submissions yet"
          emptyDescription="Responses will appear here after visitors submit this form."
          rowActions={(submission) => (
            <DataTableRowActions
              menuLabel="Submission actions"
              actions={[
                {
                  label: "View details",
                  onClick: () => setViewSubmission(submission),
                },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(submission.id),
                  destructive: true,
                },
              ]}
            />
          )}
        />

        {data && data.meta.total > limit ? (
          <ListPagination
            page={page}
            pageSize={limit}
            total={data.meta.total}
            onPageChange={setPage}
          />
        ) : null}
      </ListPage>

      <FormSubmissionDetailDialog
        submission={viewSubmission}
        open={!!viewSubmission}
        onOpenChange={(open) => !open && setViewSubmission(null)}
      />

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
            onSuccess: () => setDeleteId(null),
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
