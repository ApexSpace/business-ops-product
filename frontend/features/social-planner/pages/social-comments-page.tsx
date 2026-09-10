"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ExternalLink,
  Heart,
  MessageCircle,
  RefreshCw,
  Reply,
  Trash2,
} from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SocialPlannerShell } from "@/features/social-planner/components/social-planner-shell";
import { SocialReplyComposer } from "@/features/social-planner/components/social-reply-composer";
import {
  isOptimisticCommentId,
  useSocialCommentMutations,
  useSocialEngagement,
} from "@/features/social-planner/hooks/use-social-comments";
import type {
  SocialComment,
  SocialEngagementPostGroup,
} from "@/features/social-planner/types";
import {
  SOCIAL_PLANNER_AVATAR_CLASS,
  SOCIAL_PLANNER_CARD_CLASS,
  SOCIAL_PLANNER_CARD_SELECTED_CLASS,
  SOCIAL_PLANNER_META_ROW_CLASS,
  SOCIAL_PLANNER_POST_PREVIEW_CLASS,
  SOCIAL_PLANNER_THUMB_CLASS,
  SOCIAL_PLANNER_UNREAD_DOT_CLASS,
  SOCIAL_PLANNER_VIEW_POST_CLASS,
} from "@/features/social-planner/styles/social-planner-tokens";
import { humanizeEngagementWarnings } from "@/features/social-planner/utils/humanize-engagement-warning.util";
import { socialProviderLabel } from "@/features/social-planner/utils/social-provider-label.util";
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

function initials(name: string | null | undefined): string {
  const parts = (name ?? "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const deltaSec = Math.round((Date.now() - then) / 1000);
  if (deltaSec < 60) return "just now";
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  if (deltaSec < 86400 * 7) return `${Math.floor(deltaSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function findCommentDepth(
  comments: SocialComment[],
  id: string,
  depth = 0,
): number | null {
  for (const c of comments) {
    if (c.id === id) return depth;
    const nested = findCommentDepth(c.replies ?? [], id, depth + 1);
    if (nested != null) return nested;
  }
  return null;
}

type Selection = {
  group: SocialEngagementPostGroup;
  comment: SocialComment;
};

export function SocialCommentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProvider = searchParams.get("providerKey") ?? "";
  const socialPostId = searchParams.get("socialPostId") ?? undefined;

  const [providerKey, setProviderKey] = useState(initialProvider);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<Selection | null>(null);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(
    null,
  );

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

  const groups = data?.items ?? [];
  const warningMessages = humanizeEngagementWarnings(data?.warnings ?? []);
  const unreadCount = data?.unreadCount ?? 0;

  const selectedBusy =
    selection != null &&
    (replyPendingId === selection.comment.id ||
      likePendingId === selection.comment.id ||
      deletePendingId === selection.comment.id ||
      isOptimisticCommentId(selection.comment.id));

  const openComment = (
    group: SocialEngagementPostGroup,
    comment: SocialComment,
    startReply = false,
  ) => {
    setSelection({ group, comment });
    if (startReply) setReplyingCommentId(comment.id);
  };

  const sendReply = (comment: SocialComment, group: SocialEngagementPostGroup) => {
    const message = drafts[comment.id]?.trim();
    if (!message) return;
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[comment.id];
      return next;
    });
    replyToComment({
      commentId: comment.id,
      message,
      providerKey: comment.providerKey,
      socialPostTargetId:
        comment.socialPostTargetId || group.socialPostTargetId,
      externalPostId: comment.externalPostId || group.externalPostId,
      permalink: comment.permalink ?? group.permalink,
    });
  };

  return (
    <SocialPlannerShell
      actions={
        <>
          <IconButton
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Sync from channels"
            disabled={sync.isPending || isFetching}
            onClick={() => sync.mutate()}
          >
            <RefreshCw
              className={cn(
                "size-4",
                (sync.isPending || isFetching) && "animate-spin",
              )}
            />
          </IconButton>
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
              <Check className="mr-1.5 size-3.5" />
              {markRead.isPending ? "Marking…" : "Mark all read"}
            </Button>
          ) : null}
          <ListPrimaryAction
            label="New Post"
            onClick={() => router.push("/business/social-planner/new")}
          />
        </>
      }
    >
      <div className="space-y-[var(--spacing-4)]">
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((channel) => (
            <Button
              key={channel.key || "all"}
              size="sm"
              variant={providerKey === channel.key ? "brand" : "outline"}
              onClick={() => setProviderKey(channel.key)}
            >
              {channel.label}
            </Button>
          ))}
        </div>

        {warningMessages.length > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            Some channels could not sync:{" "}
            {warningMessages.slice(0, 3).join(" · ")}
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
          <div className="space-y-[var(--spacing-4)]">
            {groups.map((group) => {
              const isGroupSelected =
                selection?.group.socialPostTargetId ===
                group.socialPostTargetId;
              return (
                <section
                  key={group.socialPostTargetId}
                  className={cn(
                    SOCIAL_PLANNER_CARD_CLASS,
                    "space-y-[var(--spacing-3)]",
                    isGroupSelected && SOCIAL_PLANNER_CARD_SELECTED_CLASS,
                  )}
                >
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-[var(--spacing-3)]">
                    <div className={SOCIAL_PLANNER_META_ROW_CLASS}>
                      <span className="font-medium text-foreground">
                        {group.resourceName ?? "Account"}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{socialProviderLabel(group.providerKey)}</span>
                      {group.publishedAt ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            {new Date(group.publishedAt).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {group.permalink ? (
                      <a
                        href={group.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className={SOCIAL_PLANNER_VIEW_POST_CLASS}
                      >
                        View post
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : null}
                  </header>

                  <div className={SOCIAL_PLANNER_POST_PREVIEW_CLASS}>
                    <div className={SOCIAL_PLANNER_THUMB_CLASS}>Post</div>
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                      <span className="font-medium">Post Caption: </span>
                      {group.captionPreview || "(no caption)"}
                    </p>
                  </div>

                  {group.comments.length === 0 ? (
                    <EmptyState
                      compact
                      title="No comments on this post yet"
                      className="py-6"
                    />
                  ) : (
                    <div className="space-y-[var(--spacing-3)]">
                      {group.comments.map((comment) => {
                        const optimistic = isOptimisticCommentId(comment.id);
                        const alreadyLiked = likedIds.has(comment.id);
                        const isReplyingUi = replyingCommentId === comment.id;
                        const depth = 0;
                        const canReply =
                          group.capabilities.reply &&
                          !(
                            comment.providerKey === "youtube" && depth > 0
                          );
                        const busy =
                          optimistic ||
                          replyPendingId === comment.id ||
                          likePendingId === comment.id ||
                          deletePendingId === comment.id;

                        return (
                          <div
                            key={comment.id}
                            className="space-y-[var(--spacing-2)]"
                          >
                            <button
                              type="button"
                              className="flex w-full gap-[var(--spacing-3)] rounded-[var(--radius-md)] text-left hover:bg-muted/30"
                              onClick={() => openComment(group, comment)}
                            >
                              <span
                                className={SOCIAL_PLANNER_AVATAR_CLASS}
                                aria-hidden
                              >
                                {initials(comment.fromName)}
                              </span>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 text-sm">
                                    <span className="font-semibold text-foreground">
                                      {comment.fromName ?? "Unknown"}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      · {relativeTime(comment.createdTime)}
                                    </span>
                                  </div>
                                  {!comment.isRead && !optimistic ? (
                                    <span
                                      className={SOCIAL_PLANNER_UNREAD_DOT_CLASS}
                                      aria-label="Unread"
                                    />
                                  ) : null}
                                </div>
                                <p className="text-sm text-foreground">
                                  {displayMessage(comment.message)}
                                </p>
                              </div>
                            </button>

                            {!optimistic ? (
                              <div className="ml-11 flex flex-wrap items-center gap-3 text-sm">
                                {group.capabilities.likeComment ? (
                                  <button
                                    type="button"
                                    disabled={busy || alreadyLiked}
                                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                    onClick={() =>
                                      likeComment({
                                        commentId: comment.id,
                                        providerKey: comment.providerKey,
                                        socialPostTargetId:
                                          comment.socialPostTargetId ||
                                          group.socialPostTargetId,
                                      })
                                    }
                                  >
                                    <Heart
                                      className={cn(
                                        "size-3.5",
                                        alreadyLiked &&
                                          "fill-violet-primary-normal text-violet-primary-normal",
                                      )}
                                    />
                                    {alreadyLiked ? "Liked" : "Like"}
                                  </button>
                                ) : null}
                                {canReply ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    className={cn(
                                      "inline-flex items-center gap-1 text-muted-foreground hover:text-violet-primary-normal disabled:opacity-50",
                                      isReplyingUi &&
                                        "font-medium text-violet-primary-normal",
                                    )}
                                    onClick={() => {
                                      openComment(group, comment, true);
                                      setReplyingCommentId(comment.id);
                                    }}
                                  >
                                    <Reply className="size-3.5" />
                                    {isReplyingUi ? "Replying…" : "Reply"}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}

                            {isReplyingUi && canReply ? (
                              <div className="ml-11">
                                <SocialReplyComposer
                                  variant="inline"
                                  accountLabel={group.resourceName ?? "Studio"}
                                  placeholder={`Comment as ${group.resourceName ?? "your account"}…`}
                                  value={drafts[comment.id] ?? ""}
                                  disabled={busy}
                                  sending={replyPendingId === comment.id}
                                  onChange={(next) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [comment.id]: next,
                                    }))
                                  }
                                  onSend={() => sendReply(comment, group)}
                                />
                              </div>
                            ) : null}

                            {(comment.replies ?? []).length > 0 ? (
                              <div className="ml-11 space-y-2 border-l border-border pl-3">
                                {comment.replies.map((reply) => (
                                  <button
                                    key={reply.id}
                                    type="button"
                                    className="flex w-full gap-2 text-left text-sm hover:bg-muted/30"
                                    onClick={() => openComment(group, reply)}
                                  >
                                    <span
                                      className={SOCIAL_PLANNER_AVATAR_CLASS}
                                      aria-hidden
                                    >
                                      {initials(reply.fromName)}
                                    </span>
                                    <div className="min-w-0">
                                      <span className="font-medium">
                                        {reply.fromName ?? "Unknown"}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {" "}
                                        · {relativeTime(reply.createdTime)}
                                      </span>
                                      <p className="text-foreground">
                                        {displayMessage(reply.message)}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <EntityDetailDrawer
        open={selection != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelection(null);
            setReplyingCommentId(null);
          }
        }}
        title="Comment Details"
        spineLabel="COMMENT"
        width="compact"
        badges={
          selection ? (
            <Badge variant="secondary">
              {socialProviderLabel(selection.group.providerKey)}
            </Badge>
          ) : null
        }
        headerActions={
          selection?.group.permalink ? (
            <IconButton
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="View post"
              nativeButton={false}
              render={
                <a
                  href={selection.group.permalink}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <ExternalLink className="size-4" />
            </IconButton>
          ) : null
        }
        summary={
          selection ? (
            <div className="space-y-2 rounded-[var(--radius-md)] border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Published post</span>
                {selection.group.publishedAt ? (
                  <span>
                    {new Date(selection.group.publishedAt).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-3 text-sm">
                {selection.group.captionPreview || "(no caption)"}
              </p>
              {selection.group.metrics ? (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3.5 text-destructive" />
                    {selection.group.metrics.likes.toLocaleString()} likes
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3.5" />
                    {selection.group.metrics.comments.toLocaleString()} comments
                  </span>
                </div>
              ) : null}
            </div>
          ) : null
        }
        footer={
          selection &&
          selection.group.capabilities.reply &&
          !(
            selection.comment.providerKey === "youtube" &&
            (findCommentDepth(
              selection.group.comments,
              selection.comment.id,
            ) ?? 0) > 0
          ) ? (
            <SocialReplyComposer
              variant="drawer"
              accountLabel={selection.group.resourceName ?? "Studio"}
              placeholder={`Write a reply as ${selection.group.resourceName ?? "your account"}…`}
              value={drafts[selection.comment.id] ?? ""}
              disabled={selectedBusy}
              sending={replyPendingId === selection.comment.id}
              onChange={(next) =>
                setDrafts((prev) => ({
                  ...prev,
                  [selection.comment.id]: next,
                }))
              }
              onSend={() => sendReply(selection.comment, selection.group)}
            />
          ) : null
        }
      >
        {selection ? (
          <div className="space-y-[var(--spacing-4)]">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Conversation
              </p>
              <div className="space-y-3 rounded-[var(--radius-md)] border border-border p-3">
                <div className="flex items-start gap-3">
                  <span className={SOCIAL_PLANNER_AVATAR_CLASS} aria-hidden>
                    {initials(selection.comment.fromName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">
                        {selection.comment.fromName ?? "Unknown"}
                      </span>
                      <span className="text-muted-foreground">
                        {relativeTime(selection.comment.createdTime)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      {displayMessage(selection.comment.message)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      {selection.group.capabilities.likeComment ? (
                        <button
                          type="button"
                          disabled={
                            selectedBusy || likedIds.has(selection.comment.id)
                          }
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                          onClick={() =>
                            likeComment({
                              commentId: selection.comment.id,
                              providerKey: selection.comment.providerKey,
                              socialPostTargetId:
                                selection.comment.socialPostTargetId ||
                                selection.group.socialPostTargetId,
                            })
                          }
                        >
                          <Heart className="size-3.5" />
                          Like comment
                        </button>
                      ) : null}
                      {selection.group.capabilities.reply ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium text-violet-primary-normal"
                          onClick={() =>
                            setReplyingCommentId(selection.comment.id)
                          }
                        >
                          <Reply className="size-3.5" />
                          Public reply
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selection.group.capabilities.deleteComment ? (
              <Button
                type="button"
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                disabled={selectedBusy}
                onClick={() => {
                  deleteComment({
                    commentId: selection.comment.id,
                    providerKey: selection.comment.providerKey,
                    socialPostTargetId:
                      selection.comment.socialPostTargetId ||
                      selection.group.socialPostTargetId,
                  });
                  setSelection(null);
                }}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </EntityDetailDrawer>
    </SocialPlannerShell>
  );
}
