"use client";

import { cn } from "@/lib/utils";

export type StatusPillVariant =
  | "success"
  | "warning"
  | "info"
  | "neutral"
  | "danger";

const variantStyles: Record<StatusPillVariant, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  info: "bg-primary-tint text-primary-text",
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-destructive-subtle text-destructive",
};

interface StatusPillProps {
  label: string;
  variant?: StatusPillVariant;
  className?: string;
}

export function StatusPill({
  label,
  variant = "neutral",
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        variantStyles[variant],
        className,
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
