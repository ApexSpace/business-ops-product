import { useCallback, useMemo, useState } from "react";

export function useSettingsSectionState<
  TSource,
  TDraft extends Record<string, unknown>,
>(
  source: TSource | undefined,
  pick: (data: TSource) => TDraft,
) {
  const saved = useMemo(
    () => (source ? pick(source) : null),
    [source, pick],
  );
  const [override, setOverride] = useState<TDraft | null>(null);

  const values = override ?? saved;
  const isDirty =
    override != null &&
    saved != null &&
    JSON.stringify(override) !== JSON.stringify(saved);

  const reset = useCallback(() => {
    setOverride(null);
  }, []);

  const commit = useCallback((next: TDraft) => {
    setOverride(next);
  }, []);

  return { values, saved, isDirty, reset, commit, setDraft: setOverride };
}
