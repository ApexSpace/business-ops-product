"use client";

import { StatusBadge } from "@/components/data-display/status-badge";
import { cn } from "@/lib/utils";

interface ContactFinancialRecordRowProps {
  title: string;
  lines: string[];
  status?: { domain: "estimate" | "invoice" | "transaction"; value: string; label?: string };
  onOpen?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function ContactFinancialRecordRow({
  title,
  lines,
  status,
  onOpen,
  actions,
  className,
}: ContactFinancialRecordRowProps) {
  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-lg border border-border/50 bg-background px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/30",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className={cn("min-w-0 flex-1 text-left", onOpen && "cursor-pointer")}
      >
        <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
        {lines.map((line) => (
          <p
            key={line}
            className="mt-0.5 truncate text-xs text-muted-foreground"
          >
            {line}
          </p>
        ))}
        {status ? (
          <div className="mt-1.5">
            <StatusBadge
              status={status.value}
              domain={status.domain}
              label={status.label}
            />
          </div>
        ) : null}
      </button>
      {actions ? (
        <div className="flex shrink-0 items-center opacity-80 group-hover:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
