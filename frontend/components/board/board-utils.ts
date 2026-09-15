import { displayInitials } from "@/lib/ui/display-initials";

export function getBoardInitials(name: string): string {
  return displayInitials(name);
}

export function parseBoardAmount(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

import { formatMoney } from "@/features/payments/utils/currencies";

export function formatBoardColumnTotal(total: number): string {
  return formatMoney(total);
}

export function pluralizeCount(count: number, singular: string, plural?: string): string {
  const label = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${label}`;
}
