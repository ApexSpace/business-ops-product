export const GIFT_CARD_ONLINE_MIN_AMOUNT = 25;
export const GIFT_CARD_ONLINE_MAX_AMOUNT = 1000;

export function resolvePublicGiftCardUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/gift-cards/${slug}`;
  }
  return `/gift-cards/${slug}`;
}

export function resolvePublicGiftCardEmbedUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/embed/gift-cards/${slug}`;
  }
  return `/embed/gift-cards/${slug}`;
}

export function buildGiftCardEmbedCode(slug: string): string {
  const src = resolvePublicGiftCardEmbedUrl(slug);
  return `<iframe
  src="${src}"
  width="100%"
  height="720"
  style="border:0;border-radius:12px;min-height:640px;max-width:100%;"
  loading="lazy"
  title="Purchase a gift card">
</iframe>`;
}

export function formatGiftCardAmount(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}
