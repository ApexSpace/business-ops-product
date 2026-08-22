/** Display helpers shared by desktop table + mobile sales/transactions lists. */

export function formatSaleNumberDisplay(saleNumber: string): string {
  const digits = saleNumber.match(/(\d+)\s*$/)?.[1];
  if (digits) return `#${digits}`;
  return `#${saleNumber.replace(/^#+\s*/, "").trim()}`;
}

/** Figma meta date — "Oct 24, 2023" */
export function formatSalesListDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function saleStatusLabel(args: {
  status: string;
  isOpen: boolean;
}): "Void" | "Open" | "Closed" {
  if (args.status === "VOID") return "Void";
  if (args.isOpen) return "Open";
  return "Closed";
}

export function saleStatusTone(args: {
  status: string;
  isOpen: boolean;
}): "void" | "open" | "closed" {
  if (args.status === "VOID") return "void";
  if (args.isOpen) return "open";
  return "closed";
}
