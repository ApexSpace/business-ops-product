"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createNote } from "@/features/notes/api/notes.api";
import {
  CONTACTS_ENTRY_COMPOSER_CLASS,
  CONTACTS_ENTRY_FOOTER_CLASS,
  CONTACTS_ENTRY_TEXTAREA_CLASS,
  CONTACTS_ENTRY_UPLOAD_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
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
  /** `timeline` = Figma entry box; `compact` = sidebar Add Note expand */
  variant?: "default" | "timeline" | "compact";
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
  variant = "default",
  className,
}: ContactInlineNoteComposerProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const attachFileName = (file: File) => {
    const marker = `[File: ${file.name}]`;
    setBody((prev) => (prev.trim() ? `${prev.trim()}\n${marker}` : marker));
  };

  if (variant === "timeline") {
    return (
      <div className={cn(CONTACTS_ENTRY_COMPOSER_CLASS, className)}>
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) attachFileName(file);
          }}
        />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write an entry or drag in a file..."
          rows={3}
          className={CONTACTS_ENTRY_TEXTAREA_CLASS}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (file) attachFileName(file);
          }}
        />
        <div className={CONTACTS_ENTRY_FOOTER_CLASS}>
          <button
            type="button"
            className={CONTACTS_ENTRY_UPLOAD_CLASS}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Upload file
          </button>
          <Button
            type="button"
            variant="brand"
            size="sm"
            disabled={!body.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel ? (
        <p className="text-xs font-medium text-muted-foreground">Notes</p>
      ) : null}
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Enter a note…"
        rows={variant === "compact" ? 3 : 4}
        autoFocus
        className="min-h-[4.5rem] resize-y border-[var(--drawer-field-border)] bg-background text-sm focus-visible:border-violet-primary-normal focus-visible:ring-violet-primary-normal/20"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={onCancel}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="brand"
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
