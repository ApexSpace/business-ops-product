import { buildVariantKey } from './variant-key.util';

export type OptionWithValues = {
  id: string;
  name: string;
  sortOrder: number;
  values: Array<{ id: string; value: string; sortOrder: number }>;
};

export type VariantCombination = {
  optionValueIds: string[];
  variantKey: string;
};

function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, current) =>
      acc.flatMap((prefix) => current.map((item) => [...prefix, item])),
    [[]],
  );
}

export function buildVariantCombinations(
  options: OptionWithValues[],
): VariantCombination[] {
  const activeOptions = options
    .filter((option) => option.values.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  if (activeOptions.length === 0) {
    return [];
  }

  const combos = cartesianProduct(
    activeOptions.map((option) =>
      option.values
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value),
        )
        .map((value) => ({ option, value })),
    ),
  );

  return combos.map((combo) => ({
    optionValueIds: combo.map((entry) => entry.value.id),
    variantKey: buildVariantKey(
      combo.map((entry) => ({
        optionName: entry.option.name,
        optionSortOrder: entry.option.sortOrder,
        value: entry.value.value,
      })),
    ),
  }));
}
