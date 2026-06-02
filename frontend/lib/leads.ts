import type { Lead } from "@/types/api";

export function getLeadDisplayTitle(lead: Lead): string {
  if (lead.title?.trim()) return lead.title.trim();
  const c = lead.contact;
  if (!c) return "Untitled lead";
  if (c.displayName?.trim()) return c.displayName.trim();
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  if (name) return name;
  if (c.email) return c.email;
  if (c.phone) return c.phone;
  return "Untitled lead";
}

export function getLeadServiceLabel(lead: Lead): string {
  if (!lead.service) return "—";
  const parts = [lead.service.name];
  if (lead.service.category?.trim()) {
    parts.push(`(${lead.service.category.trim()})`);
  }
  return parts.join(" ");
}

export function formatLeadValue(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function getLeadContactName(lead: Lead): string {
  const c = lead.contact;
  if (!c) return "—";
  if (c.displayName?.trim()) return c.displayName.trim();
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  if (name) return name;
  if (c.email) return c.email;
  if (c.phone) return c.phone;
  return "—";
}

export function getLeadAssigneeName(lead: Lead): string | null {
  const a = lead.assignedTo;
  if (!a) return null;
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  return name || a.email;
}

export function formatLeadCreatedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
