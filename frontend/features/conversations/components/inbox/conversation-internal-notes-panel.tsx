"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { Textarea } from "@/components/ui/textarea";
import {
  createConversationNote,
  listConversationNotes,
} from "@/features/conversations/api/conversation-notes.api";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import { queryKeys } from "@/lib/query/keys";
import { formatRelativeTime } from "@/lib/ui/relative-time";
import { cn } from "@/lib/utils";

function authorLabel(note: {
  author: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}) {
  const name = [note.author.firstName, note.author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || note.author.email;
}

interface ConversationInternalNotesPanelProps {
  conversationId: string | null;
  className?: string;
  variant?: "default" | "embedded";
}

export function ConversationInternalNotesPanel({
  conversationId,
  className,
  variant = "default",
}: ConversationInternalNotesPanelProps) {
  const { apiBase } = useConversationsHost();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(variant === "embedded");

  const notesQuery = useQuery({
    queryKey: queryKeys.conversations.notes(conversationId ?? "", apiBase),
    queryFn: () => listConversationNotes(conversationId!, apiBase),
    enabled: Boolean(conversationId),
  });

  const createMutation = useMutation({
    mutationFn: (body: string) =>
      createConversationNote(conversationId!, body, apiBase),
    onSuccess: () => {
      setDraft("");
      setExpanded(true);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.notes(conversationId!, apiBase),
      });
      toast.success("Internal note added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!conversationId) return null;

  const noteCount = notesQuery.data?.length ?? 0;

  const notesBody = (
        <div className={cn("space-y-2", variant === "embedded" ? "px-3 pb-3 pt-2" : "border-t border-border/40 px-3 pb-3 pt-2")}>
          {notesQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading notes…</p>
          ) : noteCount === 0 ? (
            <p className="text-xs text-muted-foreground">
              Staff-only notes are not visible to the visitor.
            </p>
          ) : (
            <ul className="max-h-32 space-y-2 overflow-y-auto pr-1">
              {notesQuery.data?.map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-border/50 bg-background px-2.5 py-2 text-xs"
                >
                  <p className="whitespace-pre-wrap text-foreground">{note.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {authorLabel(note)} · {formatRelativeTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an internal note for your team…"
            rows={2}
            className="min-h-0 resize-none text-sm"
          />
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="brand"
              disabled={!draft.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(draft.trim())}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Add note"
              )}
            </Button>
          </div>
        </div>
  );

  if (variant === "embedded") {
    return <div className={cn("bg-background", className)}>{notesBody}</div>;
  }

  return (
    <div className={cn("border-t border-border/50 bg-muted/10", className)}>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/25"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <StickyNote className="size-3.5 shrink-0" />
          <span>Internal notes</span>
          {noteCount > 0 ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-foreground">
              {noteCount}
            </span>
          ) : null}
        </span>
        <NavArrowIcon
          direction={expanded ? "up" : "down"}
          size="sm"
          className="text-muted-foreground"
        />
      </button>

      {expanded ? notesBody : null}
    </div>
  );
}
