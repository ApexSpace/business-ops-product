"use client";

import { SquarePen } from "lucide-react";
import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import { IconButton } from "@/components/ui/icon-button";
import {
  AUTOMATED_MESSAGE_SECTION_STACK_CLASS,
  AUTOMATED_MESSAGE_TIMELINE_DOT_CLASS,
  AUTOMATED_MESSAGE_TIMELINE_LINE_CLASS,
  AUTOMATED_MESSAGE_TRIGGER_BANNER_CLASS,
  AUTOMATED_MESSAGE_TRIGGER_BANNER_LABEL_CLASS,
} from "@/lib/design/automated-message-tokens";
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
    <div className={cn(AUTOMATED_MESSAGE_TRIGGER_BANNER_CLASS, className)}>
      <p className={AUTOMATED_MESSAGE_TRIGGER_BANNER_LABEL_CLASS}>{label}</p>
      {showEdit && onEdit ? (
        <IconButton
          type="button"
          size="icon-sm"
          className="shrink-0 text-violet-primary-normal"
          onClick={onEdit}
          aria-label="Edit timing"
        >
          <SquarePen className="size-4" aria-hidden />
        </IconButton>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer DrawerAddAction directly; kept for call-site compatibility. */
export function AddMessageButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <DrawerAddAction
      label="Add message"
      onClick={onClick}
      disabled={disabled}
      size="page"
    />
  );
}

export function AutomatedMessageTimelineNode({
  children,
  isLast = false,
  className,
}: {
  children: React.ReactNode;
  isLast?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex gap-[var(--spacing-4)]", className)}>
      <div className="relative flex w-8 shrink-0 flex-col items-center">
        <span className={AUTOMATED_MESSAGE_TIMELINE_DOT_CLASS} aria-hidden />
        {!isLast ? (
          <span className={AUTOMATED_MESSAGE_TIMELINE_LINE_CLASS} aria-hidden />
        ) : null}
      </div>
      <div
        className={cn(
          AUTOMATED_MESSAGE_SECTION_STACK_CLASS,
          "min-w-0 flex-1 pb-[var(--spacing-6)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
