export function interpolateMergeTags(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return values[key] ?? '';
  });
}

export function extractMergeTagKeys(template: string): string[] {
  const keys = new Set<string>();
  const re = /\{\{\s*([^}]+?)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(template)) !== null) {
    keys.add(match[1].trim());
  }
  return [...keys];
}
