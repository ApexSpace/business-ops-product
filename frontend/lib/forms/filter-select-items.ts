import type { SelectOption } from "@/components/forms/select-field";

export function filterSelectItems(
  items: SelectOption[],
  query: string,
): SelectOption[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter((item) => item.label.toLowerCase().includes(q));
}
