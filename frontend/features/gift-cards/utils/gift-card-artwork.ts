/** Normalize gift-card artwork URLs (incl. legacy preset .jpg → .svg). */
export function normalizeGiftCardArtworkUrl(
  url?: string | null,
): string | null {
  if (!url?.trim()) return null;
  const value = url.trim();
  const legacyPreset = value.match(
    /^\/gift-cards\/artwork\/(preset_[1-6])\.jpe?g$/i,
  );
  if (legacyPreset) {
    return `/gift-cards/artwork/${legacyPreset[1]}.svg`;
  }
  return value;
}
