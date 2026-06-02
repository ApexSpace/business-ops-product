"use client";

import { formatEstimateStatus } from "@/lib/estimate-profile";
import { formatInvoiceStatus } from "@/lib/invoice-profile";
import { formatTaskStatus } from "@/lib/task-profile";
import { formatWorkItemStatus } from "@/lib/work-item-profile";
import type {
  EstimateStatus,
  InvoiceStatus,
  TaskStatus,
  WorkItemStatus,
} from "@/types/api";
import { cn } from "@/lib/utils";

export type StatusBadgeDomain =
  | "contact"
  | "lead"
  | "workItem"
  | "task"
  | "invoice"
  | "estimate"
  | "membership"
  | "business"
  | "plan"
  | "subscription"
  | "user"
  | "transaction";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneStyles: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: {
    pill: "bg-muted/70 text-muted-foreground ring-1 ring-border/50",
    dot: "bg-muted-foreground/55",
  },
  info: {
    pill: "bg-sky-500/10 text-sky-800 ring-1 ring-sky-500/20 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  success: {
    pill: "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/20 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  warning: {
    pill: "bg-amber-500/10 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  danger: {
    pill: "bg-red-500/10 text-red-800 ring-1 ring-red-500/20 dark:text-red-300",
    dot: "bg-red-500",
  },
};

function humanizeStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveLabel(domain: StatusBadgeDomain, status: string): string {
  switch (domain) {
    case "workItem":
      return formatWorkItemStatus(status as WorkItemStatus);
    case "task":
      return formatTaskStatus(status as TaskStatus);
    case "invoice":
      return formatInvoiceStatus(status as InvoiceStatus);
    case "estimate":
      return formatEstimateStatus(status as EstimateStatus);
    default:
      return humanizeStatus(status);
  }
}

function resolveTone(domain: StatusBadgeDomain, status: string): StatusTone {
  const normalized = status.toUpperCase();

  switch (domain) {
    case "workItem":
      switch (normalized as WorkItemStatus) {
        case "SCHEDULED":
          return "info";
        case "IN_PROGRESS":
          return "warning";
        case "COMPLETED":
          return "success";
        case "CANCELLED":
          return "danger";
        default:
          return "neutral";
      }

    case "task":
      switch (normalized as TaskStatus) {
        case "IN_PROGRESS":
          return "info";
        case "COMPLETED":
          return "success";
        case "CANCELLED":
          return "danger";
        default:
          return "neutral";
      }

    case "lead":
      switch (normalized) {
        case "WON":
          return "success";
        case "LOST":
          return "danger";
        case "ARCHIVED":
          return "neutral";
        default:
          return "info";
      }

    case "invoice":
      switch (normalized as InvoiceStatus) {
        case "SENT":
          return "info";
        case "PARTIAL":
          return "warning";
        case "PAID":
          return "success";
        case "OVERDUE":
        case "VOID":
          return "danger";
        default:
          return "neutral";
      }

    case "estimate":
      switch (normalized as EstimateStatus) {
        case "SENT":
          return "info";
        case "APPROVED":
        case "CONVERTED":
          return "success";
        case "REJECTED":
        case "EXPIRED":
          return "danger";
        default:
          return "neutral";
      }

    case "transaction":
      return "success";

    case "membership":
    case "user":
    case "business":
    case "plan":
    case "subscription":
    case "contact":
      switch (normalized) {
        case "ACTIVE":
        case "PAID":
        case "ENABLED":
          return "success";
        case "INACTIVE":
        case "DISABLED":
        case "ARCHIVED":
        case "SUSPENDED":
          return "neutral";
        case "CANCELLED":
        case "EXPIRED":
        case "PAST_DUE":
          return "danger";
        case "PENDING":
        case "TRIAL":
          return "warning";
        default:
          return "neutral";
      }

    default:
      return "neutral";
  }
}

export interface StatusBadgeProps {
  status: string;
  domain?: StatusBadgeDomain;
  /** @deprecated Use `domain` instead */
  category?: StatusBadgeDomain;
  label?: string;
  className?: string;
}

export function StatusBadge({
  status,
  domain,
  category,
  label,
  className,
}: StatusBadgeProps) {
  const resolvedDomain = domain ?? category;
  if (!resolvedDomain) {
    throw new Error("StatusBadge requires a `domain` prop.");
  }
  const tone = resolveTone(resolvedDomain, status);
  const styles = toneStyles[tone];
  const displayLabel = label ?? resolveLabel(resolvedDomain, status);

  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium tracking-wide",
        styles.pill,
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", styles.dot)}
        aria-hidden
      />
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

/** @deprecated Use `StatusBadgeDomain` */
export type StatusBadgeCategory = StatusBadgeDomain;
