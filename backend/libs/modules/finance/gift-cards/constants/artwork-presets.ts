export const GIFT_CARD_ARTWORK_PRESETS = [
  { key: 'preset_1', label: 'Watercolor Peach' },
  { key: 'preset_2', label: 'Botanical Green' },
  { key: 'preset_3', label: 'Palm Dark Green' },
  { key: 'preset_4', label: 'Pink Marble' },
  { key: 'preset_5', label: 'Floral Light' },
  { key: 'preset_6', label: 'Minimal Neutral' },
] as const;

export type GiftCardArtworkPresetKey =
  (typeof GIFT_CARD_ARTWORK_PRESETS)[number]['key'];
