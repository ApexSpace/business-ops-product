import type { FieldDefinition } from '../constants/data-io.constants';
import type { ColumnMappingEntry } from '../constants/data-io.constants';

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function inferColumnMappings(
  sourceHeaders: string[],
  fields: FieldDefinition[],
): ColumnMappingEntry[] {
  const usedTargets = new Set<string>();
  return sourceHeaders.map((header) => {
    const normalized = normalizeHeader(header);
    let best: { field: FieldDefinition; score: number } | null = null;

    for (const field of fields) {
      const candidates = [field.key, field.label, ...field.aliases].map(
        normalizeHeader,
      );
      if (candidates.includes(normalized)) {
        best = { field, score: 1 };
        break;
      }
      const sourceTokens = new Set(
        normalized.split('_').filter((t) => t.length > 1),
      );
      for (const candidate of candidates) {
        const fieldTokens = new Set(
          candidate.split('_').filter((t) => t.length > 1),
        );
        const intersection = [...sourceTokens].filter((t) =>
          fieldTokens.has(t),
        ).length;
        const union = new Set([...sourceTokens, ...fieldTokens]).size;
        const score = union > 0 ? intersection / union : 0;
        if (score > 0.45 && (!best || score > best.score)) {
          best = { field, score };
        }
      }
    }

    if (best && !usedTargets.has(best.field.key)) {
      usedTargets.add(best.field.key);
      return {
        sourceColumn: header,
        target: best.field.key,
        action: 'map' as const,
      };
    }

    return {
      sourceColumn: header,
      target: null,
      action: 'skip' as const,
    };
  });
}

export function applyProviderAliases(
  headers: string[],
  fields: FieldDefinition[],
  extraAliases: Record<string, string[]>,
): FieldDefinition[] {
  return fields.map((field) => ({
    ...field,
    aliases: [
      ...field.aliases,
      ...(extraAliases[field.key] ?? []),
    ],
  }));
}
