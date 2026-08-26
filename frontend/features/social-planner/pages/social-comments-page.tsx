"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isOptimisticCommentId,
  useSocialCommentMutations,
  useSocialEngagement,
} from "@/features/social-planner/hooks/use-social-comments";
import type { SocialComment } from "@/features/social-planner/types";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { key: "", label: "All" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
] as const;

function displayMessage(message: string) {
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : "No text";
}

function CommentThread({
  comment,
  capabilities,
  drafts,
  setDrafts,
  onReply,
  onLike,
  onDelete,
  replyPendingId,
  likePendingId,
  deletePendingId,
  likedIds,
  depth = 0,
}: {
  comment: SocialComment;
  capabilities: {
    reply: boolean;
    likeComment: boolean;
    deleteComment: boolean;
  };
  drafts: Record<string, string>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onReply: (comment: SocialComment, message: string) => void;
  onLike: (comment: SocialComment) => void;
  onDelete: (comment: SocialComment) => void;
  replyPendingId: string | null;
  likePendingId: string | null;
  deletePendingId: string | null;
  likedIds: ReadonlySet<string>;
  depth?: number;
}) {
  const optimistic = isOptimisticCommentId(comment.id);
  const isReplying = replyPendingId === comment.id;
  const isLiking = likePendingId === comment.id;
  const isDeleting = deletePendingId === comment.id;
  const alreadyLiked = likedIds.has(comment.id);
  const anyMutationBusy =
    replyPendingId !== null ||
    likePendingId !== null ||
    deletePendingId !== null;
  const busy =
    optimistic ||
    isReplying ||
    isLiking ||
    isDeleting ||
    (anyMutationBusy &&
      (replyPendingId === comment.id ||
        likePendingId === comment.id ||
        deletePendingId === comment.id));

  return (
    <div className={cn("space-y-3", depth > 0 && "ml-4 border-l pl-3")}>
      <div
        className={cn(
          "rounded-md border p-3",
          !comment.isRead && "border-primary/40 bg-primary/5",
          optimistic && "opacity-70",
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{comment.fromName ?? "Unknown"}</span>
          {comment.createdTime ? (
            <span>{new Date(comment.createdTime).toLocaleString()}</span>
          ) : null}
          <span>{comment.likeCount} likes</span>
          {optimistic ? (
            <span className="font-medium text-muted-foreground">Sending…</span>
          ) : null}
          {!comment.isRead && !optimistic ? (
            <span className="font-medium text-primary">Unread</span>
          ) : null}
        </div>
        <p className="mb-3 text-sm">{displayMessage(comment.message)}</p>
        {!optimistic ? (
          <div className="flex flex-wrap items-center gap-2">
            {capabilities.reply &&
            !(comment.providerKey === "youtube" && depth > 0) ? (
              <>
                <Input
                  className="max-w-md"
                  placeholder="Reply…"
                  value={drafts[comment.id] ?? ""}
                  disabled={busy || anyMutationBusy}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [comment.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const message = drafts[comment.id]?.trim();
                    if (!message || busy || anyMutationBusy) return;
                    onReply(comment, message);
                  }}
                />
                <Button
                  size="sm"
                  disabled={
                    busy || anyMutationBusy || !drafts[comment.id]?.trim()
                  }
                  onClick={() => onReply(comment, drafts[comment.id]!.trim())}
                >
                  {isReplying ? "Sending…" : "Reply"}
                </Button>
              </>
            ) : null}
            {capabilities.likeComment ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy || anyMutationBusy || alreadyLiked}
                onClick={() => onLike(comment)}
              >
                {isLiking ? "Liking…" : alreadyLiked ? "Liked" : "Like"}
              </Button>
            ) : null}
            {capabilities.deleteComment ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={busy || anyMutationBusy}
                onClick={() => onDelete(comment)}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {(comment.replies ?? []).map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          capabilities={capabilities}
          drafts={drafts}
          setDrafts={setDrafts}
          onReply={onReply}
          onLike={onLike}
          onDelete={onDelete}
          replyPendingId={replyPendingId}
          likePendingId={likePendingId}
          deletePendingId={deletePendingId}
          likedIds={likedIds}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export function SocialCommentsPage() {
  const searchParams = useSearchParams();
  const initialProvider = searchParams.get("providerKey") ?? "";
  const socialPostId = searchParams.get("socialPostId") ?? undefined;

  const [providerKey, setProviderKey] = useState(initialProvider);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const filters = useMemo(
    () => ({
      ...(providerKey ? { providerKey } : {}),
      ...(socialPostId ? { socialPostId } : {}),
    }),
    [providerKey, socialPostId],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useSocialEngagement(filters);
  const {
    sync,
    markRead,
    likedIds,
    replyPendingId,
    likePendingId,
    deletePendingId,
    replyToComment,
    likeComment,
    deleteComment,
  } = useSocialCommentMutations(filters);

  // Engagement payload is flat: { items, warnings, unreadCount }.
  // Never use data.meta.warnings — meta is often undefined and that throws.
  const groups = data?.items ?? [];
  const warnings = data?.warnings ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <PageContainer>
      <PageHeader
        title="Engagement"
        description={
          unreadCount > 0
            ? `Comments and likes on posts published from Social Planner · ${unreadCount} unread`
            : "Comments and likes on posts published from Social Planner"
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={sync.isPending || isFetching}
              onClick={() => sync.mutate()}
            >
              {sync.isPending ? "Syncing…" : "Sync from channels"}
            </Button>
            {unreadCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                disabled={markRead.isPending}
                onClick={() =>
                  markRead.mutate({
                    ...(providerKey ? { providerKey } : {}),
                    ...(socialPostId ? { socialPostId } : {}),
                  })
                }
              >
                {markRead.isPending ? "Marking…" : "Mark all read"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/business/social-planner" />}
            >
              Calendar
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((channel) => (
          <Button
            key={channel.key || "all"}
            size="sm"
            variant={providerKey === channel.key ? "default" : "outline"}
            onClick={() => setProviderKey(channel.key)}
          >
            {channel.label}
          </Button>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Some channels could not sync: {warnings.slice(0, 3).join(" · ")}
        </div>
      ) : null}

      {isError ? (
        <ApiErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <LoadingState variant="skeleton" rows={4} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No engagement found"
          description="No engagement found on published Facebook, Instagram, or YouTube posts from Social Planner. TikTok organic comments are not available via the Content Posting API."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.socialPostTargetId}
              className="space-y-3 rounded-lg border p-4"
            >
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="uppercase">{group.providerKey}</span>
                    <span>{group.resourceName ?? "Account"}</span>
                    {group.publishedAt ? (
                      <span>
                        {new Date(group.publishedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium">
                    {group.captionPreview || "(no caption)"}
                  </p>
                  {group.metrics ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {group.metrics.likes} likes · {group.metrics.comments}{" "}
                      comments
                      {group.metrics.views
                        ? ` · ${group.metrics.views} views`
                        : ""}
                    </p>
                  ) : null}
                </div>
                {group.permalink ? (
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={group.permalink}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    Open post
                  </Button>
                ) : null}
              </header>

              {group.comments.length === 0 ? (
                <EmptyState
                  compact
                  title="No comments on this post yet"
                  className="py-6"
                />
              ) : (
                group.comments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    capabilities={group.capabilities}
                    drafts={drafts}
                    setDrafts={setDrafts}
                    replyPendingId={replyPendingId}
                    likePendingId={likePendingId}
                    deletePendingId={deletePendingId}
                    likedIds={likedIds}
                    onReply={(c, message) => {
                      setDrafts((prev) => {
                        const next = { ...prev,
};
                        delete next[c.id];
                        return next;
                      });
                      replyToComment({
                        commentId: c.id,
                        message,
                        providerKey: c.providerKey,
                        socialPostTargetId:
                          c.socialPostTargetId || group.socialPostTargetId,
                        externalPostId:
                          c.externalPostId || group.externalPostId,
                        permalink: c.permalink ?? group.permalink,
                      });
                    }}
                    onLike={(c) =>
                      likeComment({
                        commentId: c.id,
                        providerKey: c.providerKey,
                        socialPostTargetId:
                          c.socialPostTargetId || group.socialPostTargetId,
                      })
                    }
                    onDelete={(c) =>
                      deleteComment({
                        commentId: c.id,
                        providerKey: c.providerKey,
                        socialPostTargetId:
                          c.socialPostTargetId || group.socialPostTargetId,
                      })
                    }
                  />
                ))
              )}
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
