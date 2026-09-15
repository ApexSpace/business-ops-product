import { slugify } from '@app/common/utils/slug.util';

export type VariantKeyOptionPair = {
  optionName: string;
  optionSortOrder: number;
  value: string;
};

export function buildVariantKey(pairs: VariantKeyOptionPair[]): string {
  const sorted = [...pairs].sort(
    (a, b) =>
      a.optionSortOrder - b.optionSortOrder ||
      a.optionName.localeCompare(b.optionName),
  );
  return sorted
    .map((pair) => `${slugify(pair.optionName)}:${slugify(pair.value)}`)
    .join('/');
}
