import type { FormLayoutPreset } from "@/features/forms/types";

export interface FormLayoutPresetDefinition {
  label: string;
  description: string;
  /** `null` means use the full available width. */
  maxWidth: number | null;
}

export const FORM_LAYOUT_PRESETS: Record<FormLayoutPreset, FormLayoutPresetDefinition> =
  {
    full: {
      label: "Full width",
      description: "Fills the page or embed area — best for embedded forms.",
      maxWidth: null,
    },
    compact: {
      label: "Compact",
      description: "Narrow layout for short contact or signup forms.",
      maxWidth: 480,
    },
    container: {
      label: "Standard",
      description: "Balanced width that works well on desktop and mobile.",
      maxWidth: 640,
    },
    wide: {
      label: "Wide",
      description: "Extra room for two-column layouts and side-by-side fields.",
      maxWidth: 800,
    },
    spacious: {
      label: "Spacious",
      description: "Maximum readable width for images and rich content.",
      maxWidth: 960,
    },
  };

export const FORM_LAYOUT_PRESET_KEYS = Object.keys(
  FORM_LAYOUT_PRESETS,
) as FormLayoutPreset[];

export const FORM_LAYOUT_SELECT_OPTIONS = FORM_LAYOUT_PRESET_KEYS.map((key) => ({
  value: key,
  label: FORM_LAYOUT_PRESETS[key].label,
}));
