"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { SocialPostStatusBadge } from "@/features/social-planner/components/social-post-status-badge";
import { useSocialPostsList } from "@/features/social-planner/hooks/use-social-posts-list";
import { useSocialPostMutations } from "@/features/social-planner/hooks/use-social-post-mutations";
import type { SocialPost } from "@/features/social-planner/types";

export function SocialPostsListPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useSocialPostsList({
    limit: 50,
  });
  const { cancel, retryTarget, remove } = useSocialPostMutations();

  const columns = useMemo<DataTableColumn<SocialPost>[]>(
    () => [
      {
        id: "caption",
        header: "Caption",
        cell: (row) => (
          <Link
            href={`/business/social-planner/${row.id}/edit`}
            className="block max-w-xs truncate font-medium hover:underline"
          >
            {row.caption || "(no caption)"}
          </Link>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <SocialPostStatusBadge status={row.status} />,
      },
      {
        id: "targets",
        header: "Targets",
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.targets.map((target) => (
              <span
                key={target.id}
                className="rounded bg-muted px-1.5 py-0.5 text-xs"
                title={target.errorMessage ?? target.status}
              >
                {target.providerKey}:{target.status.toLowerCase()}
                {target.status === "FAILED" ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-1 h-auto p-0 text-xs"
                    onClick={() => retryTarget.mutate(target.id)}
                  >
                    retry
                  </Button>
                ) : null}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "scheduled",
        header: "Scheduled",
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.scheduledAt
              ? new Date(row.scheduledAt).toLocaleString()
              : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        className: "text-right",
        cell: (row) => (
          <div className="flex flex-wrap justify-end gap-2">
            {row.targets.some(
              (t) =>
                t.status === "PUBLISHED" &&
                ["facebook", "instagram", "youtube"].includes(t.providerKey),
            ) ? (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={`/business/social-planner/comments?socialPostId=${row.id}`}
                  />
                }
              >
                Engagement
              </Button>
            ) : null}
            {row.status === "SCHEDULED" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancel.mutate(row.id)}
              >
                Cancel
              </Button>
            ) : null}
            {row.status === "DRAFT" ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => remove.mutate(row.id)}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [cancel, remove, retryTarget],
  );

  return (
    <EntityListLayout
      title="Social posts"
      description="Drafts, scheduled, and published posts"
      addButtonLabel="Compose"
      onAdd={() => router.push("/business/social-planner/new")}
      extraActions={
        <Button
          variant="brand"
          nativeButton={false}
          render={<Link href="/business/social-planner" />}
        >
          Calendar
        </Button>
      }
      error={
        isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : undefined
      }
      columns={columns}
      data={data?.items ?? []}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      density="compact"
      emptyTitle="No posts yet"
      emptyDescription="Compose your first post."
      emptyAction={
        <ActionButton
          onClick={() => router.push("/business/social-planner/new")}
        >
          Compose
        </ActionButton>
      }
    />
  );
}
