"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContactRecordsSectionId } from "@/features/contacts/workspace/contact-workspace";

interface ContactRecordSectionProps {
  sectionId: ContactRecordsSectionId;
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ContactRecordSection({
  sectionId,
  title,
  onAdd,
  addLabel = "Add",
  addDisabled,
  children,
  className,
}: ContactRecordSectionProps) {
  return (
    <section
      id={`contact-section-${sectionId}`}
      data-section={sectionId}
      className={cn("scroll-mt-3 border-b border-border/50 pb-4 last:border-0", className)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        {onAdd != null ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={onAdd}
            disabled={addDisabled}
          >
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        ) : addDisabled ? (
          <span className="text-xs text-muted-foreground">Soon</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function RecordListEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
      {message}
    </p>
  );
}

export function RecordListItem({
  title,
  meta,
  onClick,
  actions,
}: {
  title: string;
  meta?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="group flex items-start gap-2 rounded-lg border border-border/50 bg-background px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/30">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          "min-w-0 flex-1 text-left",
          onClick && "cursor-pointer",
        )}
      >
        <p className="truncate text-sm font-medium">{title}</p>
        {meta ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
        ) : null}
      </button>
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
