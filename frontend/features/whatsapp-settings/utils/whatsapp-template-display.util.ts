import type {
  WhatsAppTemplateCategory,
  WhatsAppTemplateStatus,
} from "@/features/whatsapp-settings/api/whatsapp-templates.api";

export function formatTemplateCategory(
  category: WhatsAppTemplateCategory,
): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function formatTemplateStatus(status: WhatsAppTemplateStatus): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function templateStatusVariant(
  status: WhatsAppTemplateStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "PENDING":
    case "IN_APPEAL":
      return "secondary";
    case "REJECTED":
    case "LIMIT_EXCEEDED":
      return "destructive";
    case "PAUSED":
    case "DISABLED":
    case "PENDING_DELETION":
    case "DELETED":
    default:
      return "outline";
  }
}

export function templateStatusToneClass(status: WhatsAppTemplateStatus): string {
  switch (status) {
    case "APPROVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "PENDING":
    case "IN_APPEAL":
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300";
    case "REJECTED":
    case "LIMIT_EXCEEDED":
      return "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300";
    default:
      return "border-border/60 bg-muted/50 text-muted-foreground";
  }
}

export function canEditTemplateFromStatus(
  status: WhatsAppTemplateStatus,
): boolean {
  return status === "REJECTED" || status === "PAUSED";
}

export function canDeleteTemplateFromStatus(
  status: WhatsAppTemplateStatus,
): boolean {
  return status !== "DELETED" && status !== "PENDING_DELETION";
}

export function formatTemplateTableDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function truncatePreview(value: string | null, max = 72): string {
  if (!value?.trim()) return "—";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}
