"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
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
  depth?: number;
}) {
  return (
    <div className={cn("space-y-3", depth > 0 && "ml-4 border-l pl-3")}>
      <div
        className={cn(
          "rounded-md border p-3",
          !comment.isRead && "border-primary/40 bg-primary/5",
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{comment.fromName ?? "Unknown"}</span>
          {comment.createdTime ? (
            <span>{new Date(comment.createdTime).toLocaleString()}</span>
          ) : null}
          <span>{comment.likeCount} likes</span>
          {!comment.isRead ? (
            <span className="font-medium text-primary">Unread</span>
          ) : null}
        </div>
        <p className="mb-3 text-sm">{displayMessage(comment.message)}</p>
        <div className="flex flex-wrap items-center gap-2">
          {capabilities.reply ? (
            <>
              <Input
                className="max-w-md"
                placeholder="Reply…"
                value={drafts[comment.id] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [comment.id]: e.target.value,
                  }))
                }
              />
              <Button
                size="sm"
                disabled={!drafts[comment.id]?.trim()}
                onClick={() =>
                  onReply(comment, drafts[comment.id]!.trim())
                }
              >
                Reply
              </Button>
            </>
          ) : null}
          {capabilities.likeComment ? (
            <Button size="sm" variant="outline" onClick={() => onLike(comment)}>
              Like
            </Button>
          ) : null}
          {capabilities.deleteComment ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(comment)}
            >
              Delete
            </Button>
          ) : null}
        </div>
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
  const [refresh, setRefresh] = useState(false);

  const filters = useMemo(
    () => ({
      ...(providerKey ? { providerKey } : {}),
      ...(socialPostId ? { socialPostId } : {}),
      ...(refresh ? { refresh: true } : {}),
    }),
    [providerKey, socialPostId, refresh],
  );

  const { data, isLoading, isFetching, refetch } =
    useSocialEngagement(filters);
  const { reply, like, remove, markRead } = useSocialCommentMutations(filters);

  const groups = data?.items ?? [];
  const warnings = data?.meta.warnings ?? [];
  const unreadCount = data?.meta.unreadCount ?? 0;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Engagement</h1>
          <p className="text-sm text-muted-foreground">
            Comments and likes on posts published from Social Planner
            {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => {
              setRefresh(true);
              void refetch();
            }}
          >
            {isFetching ? "Syncing…" : "Sync from channels"}
          </Button>
          {unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                markRead.mutate({
                  ...(providerKey ? { providerKey } : {}),
                  ...(socialPostId ? { socialPostId } : {}),
                })
              }
            >
              Mark all read
            </Button>
          ) : null}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/business/social-planner" />}
          >
            Calendar
          </Button>
        </div>
      </div>

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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading engagement…</p>
      ) : null}

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
              <p className="text-sm text-muted-foreground">
                No comments on this post yet.
              </p>
            ) : (
              group.comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  capabilities={group.capabilities}
                  drafts={drafts}
                  setDrafts={setDrafts}
                  onReply={(c, message) => {
                    reply.mutate(
                      {
                        commentId: c.id,
                        message,
                        providerKey: c.providerKey,
                        socialPostTargetId: c.socialPostTargetId,
                      },
                      {
                        onSuccess: () =>
                          setDrafts((prev) => {
                            const next = { ...prev };
                            delete next[c.id];
                            return next;
                          }),
                      },
                    );
                  }}
                  onLike={(c) =>
                    like.mutate({
                      commentId: c.id,
                      providerKey: c.providerKey,
                      socialPostTargetId: c.socialPostTargetId,
                    })
                  }
                  onDelete={(c) =>
                    remove.mutate({
                      commentId: c.id,
                      providerKey: c.providerKey,
                      socialPostTargetId: c.socialPostTargetId,
                    })
                  }
                />
              ))
            )}
          </section>
        ))}

        {!isLoading && groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No engagement found on published Facebook, Instagram, or YouTube
            posts from Social Planner.
          </p>
        ) : null}
      </div>
    </div>
  );
}
