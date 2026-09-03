"use client";

import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AutomatedMessageTriggerBanner({
  label,
  onEdit,
  showEdit = true,
  className,
}: {
  label: string;
  onEdit?: () => void;
  showEdit?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-full bg-violet-primary-surface px-4 py-2",
        className,
      )}
    >
      <p className="text-sm font-semibold text-violet-primary-darker">{label}</p>
      {showEdit && onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-violet-primary-normal"
          onClick={onEdit}
          aria-label="Edit timing"
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

export function AddMessageButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-primary-normal hover:underline disabled:opacity-50"
    >
      <Plus className="size-4" aria-hidden />
      Add message
    </button>
  );
}

export function AutomatedMessageTimelineNode({
  children,
  isLast = false,
}: {
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex gap-4 pl-1">
      <div className="relative flex w-4 shrink-0 flex-col items-center">
        <span className="mt-2 size-3 rounded-full bg-violet-primary-normal" />
        {!isLast ? (
          <span className="mt-1 w-px flex-1 bg-[#E0DCD4]" aria-hidden />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-3 pb-8">{children}</div>
    </div>
  );
}
