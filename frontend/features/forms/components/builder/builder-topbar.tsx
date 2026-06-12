"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  Code2,
  ClipboardList,
  Copy,
  Download,
  Eye,
  MoreVertical,
  Pencil,
  Redo2,
  Save,
  Send,
  Undo2,
} from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import type { FormStatus } from "@/features/forms/types";
import { formStatusLabel, formStatusVariant } from "@/features/forms/utils/form-display.util";

interface BuilderTopbarProps {
  formId?: string | null;
  name: string;
  status: FormStatus;
  isDirty: boolean;
  isSaving: boolean;
  canSave: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onPreview: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onPublish: () => void;
  onMoveToDraft: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onExport: () => void;
  onEmbed: () => void;
  onDelete: () => void;
}

function FormNameEditor({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onNameChange(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  const startEditing = () => {
    setDraft(name);
    setEditing(true);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className="max-w-md font-medium"
        aria-label="Form name"
      />
    );
  }

  return (
    <div className="flex min-w-0 max-w-md items-center gap-1">
      <span className="truncate font-medium" title={name}>
        {name}
      </span>
      <IconButton
        aria-label="Edit form name"
        className="size-7 shrink-0"
        onClick={startEditing}
      >
        <Pencil className="size-3.5" />
      </IconButton>
    </div>
  );
}

export function BuilderTopbar({
  formId,
  name,
  status,
  isDirty,
  isSaving,
  canSave,
  canUndo,
  canRedo,
  onNameChange,
  onSave,
  onPreview,
  onUndo,
  onRedo,
  onPublish,
  onMoveToDraft,
  onDuplicate,
  onArchive,
  onExport,
  onEmbed,
  onDelete,
}: BuilderTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-background px-[var(--page-padding-x)] py-3">
      <IconButton
        aria-label="Back to forms"
        className="size-9"
        nativeButton={false}
        render={<Link href="/business/settings/forms" />}
      >
        <ArrowLeft className="size-4" />
      </IconButton>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <FormNameEditor name={name} onNameChange={onNameChange} />
        <Badge variant={formStatusVariant(status)}>{formStatusLabel(status)}</Badge>
        {isDirty ? (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {onUndo ? (
          <IconButton
            aria-label="Undo"
            className="size-9"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 className="size-4" />
          </IconButton>
        ) : null}
        {onRedo ? (
          <IconButton
            aria-label="Redo"
            className="size-9"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 className="size-4" />
          </IconButton>
        ) : null}

        {formId ? (
          <ActionButton
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/business/settings/forms/${formId}/submissions`} />
            }
          >
            <ClipboardList className="mr-2 size-4" />
            View submissions
          </ActionButton>
        ) : null}

        <ActionButton variant="outline" size="sm" onClick={onPreview}>
          <Eye className="mr-2 size-4" />
          Preview
        </ActionButton>

        <ActionButton size="sm" onClick={onSave} disabled={!canSave || isSaving}>
          <Save className="mr-2 size-4" />
          {isSaving ? "Saving…" : "Save"}
        </ActionButton>

        {status !== "published" ? (
          <ActionButton size="sm" variant="secondary" onClick={onPublish}>
            <Send className="mr-2 size-4" />
            Publish
          </ActionButton>
        ) : (
          <ActionButton size="sm" variant="outline" onClick={onMoveToDraft}>
            Move to draft
          </ActionButton>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <IconButton aria-label="More actions" className="size-9">
                <MoreVertical className="size-4" />
              </IconButton>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 size-4" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEmbed}>
              <Code2 className="mr-2 size-4" />
              Embed
            </DropdownMenuItem>
            {status !== "archived" ? (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 size-4" />
                Archive
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Delete form
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
