"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createNote } from "@/features/notes/api/notes.api";
import {
  invalidateContactWorkspace,
  invalidateNoteLists,
} from "@/lib/query/invalidation";
import { cn } from "@/lib/utils";

interface ContactInlineNoteComposerProps {
  contactId: string;
  onCancel: () => void;
  onSuccess?: () => void;
  showLabel?: boolean;
  className?: string;
}

function noteTitleFromBody(body: string): string {
  const firstLine = body.trim().split(/\r?\n/)[0]?.trim() ?? "";
  if (firstLine.length > 0) {
    return firstLine.slice(0, 300);
  }
  return "Note";
}

export function ContactInlineNoteComposer({
  contactId,
  onCancel,
  onSuccess,
  showLabel = true,
  className,
}: ContactInlineNoteComposerProps) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = body.trim();
      if (!trimmed) {
        throw new Error("Enter a note before saving");
      }
      return createNote({
        contactId,
        title: noteTitleFromBody(trimmed),
        description: trimmed,
      });
    },
    onSuccess: async () => {
      toast.success("Note created");
      setBody("");
      await Promise.all([
        invalidateContactWorkspace(queryClient, contactId),
        invalidateNoteLists(queryClient),
      ]);
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel ? (
        <p className="text-xs font-medium text-muted-foreground">Notes</p>
      ) : null}
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Enter a note…"
        rows={4}
        autoFocus
        className="min-h-[5.5rem] resize-y bg-background text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!body.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
