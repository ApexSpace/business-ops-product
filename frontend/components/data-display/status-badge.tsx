"use client";

import { formatEstimateStatus } from "@/features/estimates/schemas/estimate-profile";
import { formatInvoiceStatus } from "@/features/invoices/schemas/invoice-profile";
import { formatTaskStatus } from "@/features/tasks/schemas/task-profile";
import { formatWorkItemStatus } from "@/features/work-items/schemas/work-item-profile";
import type { EstimateStatus } from "@/features/estimates/types";
import type { InvoiceStatus } from "@/features/invoices/types";
import type { TaskStatus } from "@/features/tasks/types";
import type { WorkItemStatus } from "@/features/work-items/types";
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
  | "planGroup"
  | "planTier"
  | "snapshot"
  | "capability"
  | "capabilityFeature"
  | "subscription"
  | "subscriptionPayment"
  | "user"
  | "transaction";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneStyles: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: {
    pill: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/55",
  },
  info: {
    pill: "bg-primary-tint text-primary-text",
    dot: "bg-primary",
  },
  success: {
    pill: "bg-success-subtle text-success",
    dot: "bg-success",
  },
  warning: {
    pill: "bg-warning-subtle text-warning",
    dot: "bg-warning",
  },
  danger: {
    pill: "bg-destructive-subtle text-destructive",
    dot: "bg-destructive",
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
      if (normalized === "REFUNDED") {
        return "warning";
      }
      return "success";

    case "snapshot":
    case "planGroup":
    case "planTier":
      switch (normalized) {
        case "PUBLISHED":
          return "success";
        case "DRAFT":
          return "warning";
        case "ARCHIVED":
          return "neutral";
        default:
          return "neutral";
      }

    case "capability":
      switch (normalized) {
        case "ACTIVE":
          return "success";
        case "DRAFT":
          return "warning";
        case "INACTIVE":
          return "neutral";
        case "DEPRECATED":
          return "danger";
        default:
          return "neutral";
      }

    case "capabilityFeature":
      switch (normalized) {
        case "ACTIVE":
          return "success";
        case "BETA":
          return "warning";
        case "INTERNAL":
          return "info";
        case "DISABLED":
          return "neutral";
        case "DEPRECATED":
          return "danger";
        default:
          return "neutral";
      }

    case "membership":
    case "user":
    case "business":
      switch (normalized) {
        case "ACTIVE":
          return "success";
        case "NOT_ACTIVE":
          return "warning";
        case "SUSPENDED":
          return "danger";
        case "ARCHIVED":
          return "neutral";
        default:
          return "neutral";
      }

    case "plan":
      switch (normalized) {
        case "ACTIVE":
          return "success";
        case "ARCHIVED":
          return "neutral";
        default:
          return "neutral";
      }

    case "subscription":
      switch (normalized) {
        case "ACTIVE":
          return "success";
        case "TRIALING":
          return "warning";
        case "PENDING_PAYMENT":
          return "warning";
        case "INTERNAL":
          return "info";
        case "CANCELED":
          return "neutral";
        case "EXPIRED":
        case "PAST_DUE":
          return "danger";
        default:
          return "neutral";
      }

    case "subscriptionPayment":
      switch (normalized) {
        case "PAID":
          return "success";
        case "PENDING":
        case "PARTIALLY_PAID":
          return "warning";
        case "FAILED":
        case "OVERDUE":
          return "danger";
        case "REFUNDED":
          return "neutral";
        case "NOT_REQUIRED":
          return "info";
        default:
          return "neutral";
      }

    case "contact":
      switch (normalized) {
        case "ACTIVE":
        case "PAID":
        case "ENABLED":
          return "success";
        case "INACTIVE":
        case "DISABLED":
        case "ARCHIVED":
          return "neutral";
        case "CANCELLED":
        case "EXPIRED":
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
  /** When true, renders a colored dot before the label. Defaults to false. */
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  domain,
  category,
  label,
  showDot = false,
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
        "inline-flex h-auto max-w-full items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[11px] font-medium",
        styles.pill,
        className,
      )}
    >
      {showDot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", styles.dot)}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

/** @deprecated Use `StatusBadgeDomain` */
export type StatusBadgeCategory = StatusBadgeDomain;
