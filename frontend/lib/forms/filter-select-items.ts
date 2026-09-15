import type { SelectOption } from "@/components/forms/select-field";

export function selectItemMatchesQuery(
  item: SelectOption,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    item.label.toLowerCase().includes(q) ||
    (item.description?.toLowerCase().includes(q) ?? false)
  );
}

export function filterSelectItems(
  items: SelectOption[],
  query: string,
): SelectOption[] {
  return items.filter((item) => selectItemMatchesQuery(item, query));
}
