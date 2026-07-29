export function formatMergeTag(key: string): string {
  const trimmed = key.trim();
  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) return trimmed;
  return `{{${trimmed}}}`;
}

export function insertMergeTagAtCursor(
  value: string,
  mergeTag: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; cursor: number } {
  const tag = formatMergeTag(mergeTag);
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const nextValue = `${before}${tag}${after}`;
  return {
    value: nextValue,
    cursor: before.length + tag.length,
  };
}
