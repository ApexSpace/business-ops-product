import type { AutomationCategory } from "@/features/automations/types/metadata";

export type RegistryListItem = {
  key: string;
  category: string;
  label: string;
  description: string;
};

export function filterRegistryItems<T extends RegistryListItem>(
  items: T[],
  search?: string,
): T[] {
  const needle = search?.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(needle) ||
      item.description.toLowerCase().includes(needle) ||
      item.key.toLowerCase().includes(needle) ||
      item.category.toLowerCase().includes(needle),
  );
}

export function groupRegistryItemsByCategory<T extends RegistryListItem>(
  items: T[],
  categories: AutomationCategory[],
): Array<{ category: AutomationCategory; items: T[] }> {
  const categoryByKey = new Map(categories.map((c) => [c.key, c]));
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const bucket = grouped.get(item.category) ?? [];
    bucket.push(item);
    grouped.set(item.category, bucket);
  }

  return [...grouped.entries()]
    .map(([categoryKey, bucket]) => {
      const category = categoryByKey.get(categoryKey) ?? {
        key: categoryKey,
        label: categoryKey,
        description: "",
        sortOrder: 999,
        scopes: [],
      };
      return {
        category,
        items: bucket.sort((a, b) => a.label.localeCompare(b.label)),
      };
    })
    .sort((a, b) => a.category.sortOrder - b.category.sortOrder);
}

export function countRegistryItemsByCategory<T extends RegistryListItem>(
  items: T[],
): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});
}
