export const GIFT_CARD_ARTWORK_PUBLIC_BASE = '/gift-cards/artwork';

export const GIFT_CARD_ARTWORK_PRESETS = [
  {
    key: 'preset_1',
    label: 'Watercolor Peach',
    fileName: 'preset_1.svg',
  },
  {
    key: 'preset_2',
    label: 'Botanical Green',
    fileName: 'preset_2.svg',
  },
  {
    key: 'preset_3',
    label: 'Palm Dark Green',
    fileName: 'preset_3.svg',
  },
  {
    key: 'preset_4',
    label: 'Pink Marble',
    fileName: 'preset_4.svg',
  },
  {
    key: 'preset_5',
    label: 'Floral Light',
    fileName: 'preset_5.svg',
  },
  {
    key: 'preset_6',
    label: 'Minimal Neutral',
    fileName: 'preset_6.svg',
  },
] as const;

export type GiftCardArtworkPresetKey =
  (typeof GIFT_CARD_ARTWORK_PRESETS)[number]['key'];

export function giftCardArtworkPresetUrl(key: string): string | null {
  const preset = GIFT_CARD_ARTWORK_PRESETS.find((p) => p.key === key);
  if (!preset) return null;
  return `${GIFT_CARD_ARTWORK_PUBLIC_BASE}/${preset.fileName}`;
}
