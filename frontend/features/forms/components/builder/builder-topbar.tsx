"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  ClipboardList,
  Copy,
  Download,
  Share2,
} from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import { StatusPill } from "@/components/data-display/status-pill";
import { useFormsHost } from "@/features/forms/forms-host-context";
import type { FormStatus } from "@/features/forms/types";
import {
  formatFormSavedAgo,
  formStatusLabel,
} from "@/features/forms/utils/form-display.util";
import {
  FORMS_BUILDER_BACK_LINK_CLASS,
  FORMS_BUILDER_HEADER_ACTIONS_CLASS,
  FORMS_BUILDER_HEADER_CLASS,
  FORMS_BUILDER_HEADER_CLUSTER_CLASS,
  FORMS_BUILDER_HEADER_DIVIDER_CLASS,
  FORMS_BUILDER_SAVED_META_CLASS,
} from "@/lib/design/forms-builder-tokens";

interface BuilderTopbarProps {
  formId?: string | null;
  name: string;
  status: FormStatus;
  isDirty: boolean;
  savedAt?: string | null;
  onNameChange: (name: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  onMoveToDraft: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onExport: () => void;
  onShare: () => void;
  onDelete: () => void;
}

function statusPillVariant(status: FormStatus): "info" | "success" | "neutral" {
  if (status === "published") return "success";
  if (status === "archived") return "neutral";
  return "info";
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
    setDraft(name);
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
        className="h-8 max-w-[12rem] font-semibold"
        aria-label="Form name"
      />
    );
  }

  return (
    <button
      type="button"
      className="min-w-0 max-w-[12rem] truncate text-left text-sm font-semibold text-foreground"
      title={name}
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
    >
      {name}
    </button>
  );
}

export function BuilderTopbar({
  formId,
  name,
  status,
  isDirty,
  savedAt,
  onNameChange,
  onPreview,
  onPublish,
  onMoveToDraft,
  onDuplicate,
  onArchive,
  onExport,
  onShare,
  onDelete,
}: BuilderTopbarProps) {
  const { basePath } = useFormsHost();

  return (
    <header className={FORMS_BUILDER_HEADER_CLASS}>
      <div className={FORMS_BUILDER_HEADER_CLUSTER_CLASS}>
        <Link href={basePath} className={FORMS_BUILDER_BACK_LINK_CLASS}>
          <ArrowLeft className="size-4" />
          Forms
        </Link>
        <span className={FORMS_BUILDER_HEADER_DIVIDER_CLASS} aria-hidden />
        <FormNameEditor name={name} onNameChange={onNameChange} />
        <StatusPill
          label={formStatusLabel(status)}
          variant={statusPillVariant(status)}
          showDot
          className="bg-violet-primary-surface text-violet-primary-normal"
        />
        <span className={FORMS_BUILDER_SAVED_META_CLASS}>
          {isDirty ? "Unsaved" : formatFormSavedAgo(savedAt)}
        </span>
      </div>

      <div className={FORMS_BUILDER_HEADER_ACTIONS_CLASS}>
        <ActionButton variant="outline" onClick={onPreview}>
          Preview
        </ActionButton>
        {status === "published" ? (
          <ActionButton variant="outline" onClick={onMoveToDraft}>
            Move to draft
          </ActionButton>
        ) : (
          <ActionButton onClick={onPublish}>Publish</ActionButton>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<MoreActionsButton aria-label="More actions" />}
          />
          <DropdownMenuContent align="end" className="w-48">
            {formId ? (
              <DropdownMenuItem
              render={<Link href={`${basePath}/${formId}/submissions`} />}
            >
                <ClipboardList className="mr-2 size-4" />
                View submissions
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 size-4" />
              Share & embed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 size-4" />
              Export JSON
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
