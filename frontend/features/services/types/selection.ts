export type ServicesSelection =
  | { type: "category"; id: string }
  | { type: "service"; id: string }
  | null;

export const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 120] as const;

export function durationPresetItems(presets: readonly number[] = DURATION_PRESETS) {
  return presets.map((m) => ({
    value: String(m),
    label: `${m} min`,
  }));
}
