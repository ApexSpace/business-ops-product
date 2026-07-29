import {
  FORM_LAYOUT_PRESET_KEYS,
  FORM_LAYOUT_PRESETS,
} from "@/features/forms/constants/form-layout-presets.constant";
import type { FormLayoutPreset, FormSettings } from "@/features/forms/types";

const DEFAULT_LAYOUT: FormLayoutPreset = "container";

export function isFormLayoutPreset(value: unknown): value is FormLayoutPreset {
  return (
    typeof value === "string" &&
    FORM_LAYOUT_PRESET_KEYS.includes(value as FormLayoutPreset)
  );
}

export function inferFormLayoutFromMaxWidth(
  maxWidth?: number,
): FormLayoutPreset {
  if (maxWidth == null || maxWidth <= 0 || maxWidth >= 1200) {
    return "full";
  }

  let best: FormLayoutPreset = DEFAULT_LAYOUT;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const key of FORM_LAYOUT_PRESET_KEYS) {
    const presetWidth = FORM_LAYOUT_PRESETS[key].maxWidth;
    if (presetWidth == null) continue;
    const diff = Math.abs(presetWidth - maxWidth);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = key;
    }
  }

  return best;
}

export function resolveFormLayout(settings: Pick<FormSettings, "layoutWidth" | "maxWidth">): FormLayoutPreset {
  if (isFormLayoutPreset(settings.layoutWidth)) {
    return settings.layoutWidth;
  }
  return inferFormLayoutFromMaxWidth(settings.maxWidth);
}

export function resolveFormMaxWidthPx(
  layout: FormLayoutPreset,
): number | null {
  return FORM_LAYOUT_PRESETS[layout].maxWidth;
}

export function getFormLayoutDescription(layout: FormLayoutPreset): string {
  return FORM_LAYOUT_PRESETS[layout].description;
}

export function applyFormLayoutPreset(
  layout: FormLayoutPreset,
): Pick<FormSettings, "layoutWidth" | "maxWidth"> {
  const maxWidth = resolveFormMaxWidthPx(layout);
  return {
    layoutWidth: layout,
    maxWidth: maxWidth ?? undefined,
  };
}

export function syncFormLayoutSettings(
  settings: Partial<FormSettings>,
): Pick<FormSettings, "layoutWidth" | "maxWidth"> {
  const layout = resolveFormLayout(settings);
  return applyFormLayoutPreset(layout);
}
