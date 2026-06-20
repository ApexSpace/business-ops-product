"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createConversationNote,
  listConversationNotes,
} from "@/features/conversations/api/conversation-notes.api";
import { queryKeys } from "@/lib/query/keys";
import { formatRelativeTime } from "@/lib/ui/relative-time";

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
}

export function ConversationInternalNotesPanel({
  conversationId,
}: ConversationInternalNotesPanelProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const notesQuery = useQuery({
    queryKey: queryKeys.conversations.notes(conversationId ?? ""),
    queryFn: () => listConversationNotes(conversationId!),
    enabled: Boolean(conversationId),
  });

  const createMutation = useMutation({
    mutationFn: (body: string) => createConversationNote(conversationId!, body),
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.notes(conversationId!),
      });
      toast.success("Internal note added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!conversationId) return null;

  return (
    <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <StickyNote className="size-3.5" />
        Internal notes
      </div>
      <div className="space-y-2">
        {notesQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading notes…</p>
        ) : (notesQuery.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">
            Staff-only notes are not visible to the visitor.
          </p>
        ) : (
          <ul className="max-h-28 space-y-2 overflow-y-auto pr-1">
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
        <Button
          size="sm"
          variant="secondary"
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
}
