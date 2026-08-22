import { Gift } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import type { GiftCardListItem } from "@/features/gift-cards/types";
import { normalizeGiftCardArtworkUrl } from "@/features/gift-cards/utils/gift-card-artwork";

export function GiftCardStatusBadge({
  status,
}: {
  status: GiftCardListItem["status"];
}) {
  return <StatusBadge domain="giftCard" status={status} />;
}

export function maskGiftCardNumber(number: string) {
  const digits = number.replace(/\D/g, "");
  const last4 = digits.slice(-4) || number.slice(-4);
  return `•••• •• ${last4}`;
}

export function GiftCardMiniIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-5 w-8 shrink-0 overflow-hidden rounded-sm bg-gradient-to-br from-foreground/85 to-primary shadow-sm",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-x-1 top-1.5 h-0.5 rounded-full bg-white/35" />
    </div>
  );
}

export function GiftCardVisual({
  businessName,
  number,
  balance,
  status,
  artworkUrl,
}: {
  businessName?: string;
  number: string;
  balance: string;
  status: GiftCardListItem["status"];
  artworkUrl?: string | null;
}) {
  const statusLabel =
    status === "VOIDED" ? "Voided" : status === "DEPLETED" ? "Depleted" : "Active";
  const resolvedArtwork = normalizeGiftCardArtworkUrl(artworkUrl);
  const hasArtwork =
    !!resolvedArtwork &&
    (resolvedArtwork.startsWith("/") ||
      resolvedArtwork.startsWith("http://") ||
      resolvedArtwork.startsWith("https://"));

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-lg",
        !hasArtwork &&
          "bg-gradient-to-br from-foreground via-foreground/95 to-primary",
      )}
    >
      {hasArtwork ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG/CDN artwork */}
          <img
            src={resolvedArtwork}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.12),transparent_40%)]" />
      )}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-primary-foreground/80">
            {businessName ?? "Gift card"}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/90">
            <Gift className="size-3.5" aria-hidden />
            Gift Card
          </div>
        </div>
        <div
          className="mt-5 h-[22px] w-[30px] rounded-[5px] bg-gradient-to-br from-amber-300 to-amber-600 shadow-inner"
          aria-hidden
        >
          <div className="m-1 h-full rounded-[3px] border border-black/15" />
        </div>
        <p className="mt-4 text-lg font-semibold tracking-widest tabular-nums">
          {maskGiftCardNumber(number)}
        </p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-primary-foreground/75">
              Balance
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {formatMoney(balance)}
            </p>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
