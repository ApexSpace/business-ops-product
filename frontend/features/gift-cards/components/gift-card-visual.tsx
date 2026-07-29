import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import type { GiftCardListItem } from "@/features/gift-cards/types";

export function GiftCardStatusBadge({
  status,
}: {
  status: GiftCardListItem["status"];
}) {
  if (status === "VOIDED") {
    return <Badge variant="destructive">Voided</Badge>;
  }
  if (status === "DEPLETED") {
    return <Badge variant="neutral">Depleted</Badge>;
  }
  return <Badge variant="success">Active</Badge>;
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
}: {
  businessName?: string;
  number: string;
  balance: string;
  status: GiftCardListItem["status"];
}) {
  const statusLabel =
    status === "VOIDED" ? "Voided" : status === "DEPLETED" ? "Depleted" : "Active";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-foreground via-foreground/95 to-primary p-5 text-primary-foreground shadow-lg">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.12),transparent_40%)]" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-primary-foreground/70">
            {businessName ?? "Gift card"}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/85">
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
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-primary-foreground/70">
              Balance
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {formatMoney(balance)}
            </p>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
