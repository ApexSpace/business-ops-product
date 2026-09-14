import { DateTime } from "luxon";
import type {
  FormField,
  FormListItem,
  FormRecord,
  FormStatus,
} from "@/features/forms/types";
import { INPUT_FIELD_TYPES } from "@/features/forms/utils/field-defaults.util";

export function formStatusLabel(status: FormStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function formStatusVariant(
  status: FormStatus,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "published") return "default";
  if (status === "draft") return "secondary";
  return "outline";
}

export function formatFormTableDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return "";
  return dt.toLocaleString(DateTime.DATETIME_MED);
}

export function formatFormSavedAgo(
  iso: string | null | undefined,
  now: DateTime = DateTime.now(),
): string {
  if (!iso) return "Saved just now";
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return "Saved just now";
  const minutes = Math.max(0, Math.floor(now.diff(dt, "minutes").minutes));
  if (minutes < 1) return "Saved just now";
  if (minutes < 60) return `Saved ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Saved ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Saved ${days}d ago`;
}

export function countFormFields(fields: FormField[]): number {
  let count = 0;
  for (const field of fields) {
    if (INPUT_FIELD_TYPES.includes(field.type)) {
      count += 1;
    }
    if (field.type === "columns" && field.columns) {
      for (const column of field.columns) {
        count += countFormFields(column);
      }
    }
  }
  return count;
}

export function toFormListItem(record: FormRecord): FormListItem {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    publicKey: record.publicKey,
    status: record.status,
    fieldCount: record.definition.fields.length,
    submissionCount: 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    archivedAt: record.archivedAt,
  };
}

export function exportFormJson(record: FormRecord): string {
  return JSON.stringify(record, null, 2);
}

export function downloadFormJson(record: FormRecord): void {
  const blob = new Blob([exportFormJson(record)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${record.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "form"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
