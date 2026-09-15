"use client";

import { cn } from "@/lib/utils";
import { MOBILE_LIST_STATUS_PILL_BASE_CLASS } from "@/lib/design/mobile-list-tokens";

export type StatusPillVariant =
  | "success"
  | "warning"
  | "info"
  | "neutral"
  | "danger";

/** Shared status capsule chrome — single shape/size for desktop + mobile. */
export const STATUS_PILL_BASE_CLASS = MOBILE_LIST_STATUS_PILL_BASE_CLASS;

const variantStyles: Record<StatusPillVariant, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  info: "bg-primary-tint text-primary-text",
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-destructive-subtle text-destructive",
};

const variantDotStyles: Record<StatusPillVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-primary",
  neutral: "bg-muted-foreground/55",
  danger: "bg-destructive",
};

interface StatusPillProps {
  label: string;
  variant?: StatusPillVariant;
  showDot?: boolean;
  className?: string;
}

export function StatusPill({
  label,
  variant = "neutral",
  showDot = false,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        STATUS_PILL_BASE_CLASS,
        variantStyles[variant],
        className,
      )}
      title={label}
    >
      {showDot ? (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            variantDotStyles[variant],
          )}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
