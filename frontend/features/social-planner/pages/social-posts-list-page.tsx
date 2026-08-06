"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SocialPostStatusBadge } from "@/features/social-planner/components/social-post-status-badge";
import { useSocialPostsList } from "@/features/social-planner/hooks/use-social-posts-list";
import { useSocialPostMutations } from "@/features/social-planner/hooks/use-social-post-mutations";

export function SocialPostsListPage() {
  const { data, isLoading } = useSocialPostsList({ limit: 50 });
  const { cancel, retryTarget, remove } = useSocialPostMutations();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Social posts</h1>
          <p className="text-sm text-muted-foreground">
            Drafts, scheduled, and published posts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/business/social-planner" />}
          >
            Calendar
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/business/social-planner/new" />}
          >
            Compose
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Caption</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((post) => (
              <TableRow key={post.id}>
                <TableCell className="max-w-xs truncate">
                  <Link
                    href={`/business/social-planner/${post.id}/edit`}
                    className="hover:underline"
                  >
                    {post.caption || "(no caption)"}
                  </Link>
                </TableCell>
                <TableCell>
                  <SocialPostStatusBadge status={post.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {post.targets.map((target) => (
                      <span
                        key={target.id}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs"
                        title={target.errorMessage ?? target.status}
                      >
                        {target.providerKey}:{target.status.toLowerCase()}
                        {target.status === "FAILED" ? (
                          <button
                            type="button"
                            className="ml-1 underline"
                            onClick={() => retryTarget.mutate(target.id)}
                          >
                            retry
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  {post.targets.some(
                    (t) =>
                      t.status === "PUBLISHED" &&
                      ["facebook", "instagram", "youtube"].includes(
                        t.providerKey,
                      ),
                  ) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={
                        <Link
                          href={`/business/social-planner/comments?socialPostId=${post.id}`}
                        />
                      }
                    >
                      Engagement
                    </Button>
                  ) : null}
                  {post.status === "SCHEDULED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancel.mutate(post.id)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                  {post.status === "DRAFT" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => remove.mutate(post.id)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (data?.items?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No posts yet. Compose your first post.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
